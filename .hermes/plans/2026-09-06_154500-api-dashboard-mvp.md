# Personal API Dashboard — MVP Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Ship a portfolio-ready full-stack API dashboard: Next.js App Router (registry UI + dashboard + proxy middleware), PostgreSQL (Docker Compose), Slack webhook alerting, 5 hardcoded pricing rules.

**Architecture:** Single Next.js runtime with API routes acting as registry CRUD, cost engine, and alert dispatcher. Go proxy skipped for MVP — proxy implemented as Next.js middleware intercepting outbound calls via `/api/proxy` endpoint (reviewers curl through it). PostgreSQL persisted to `./data/` via Docker volume.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind 3, Prisma 5, PostgreSQL 16, Docker Compose. No TypeScript in runtime code (matching existing Onyx conventions). npm lock.

---

## Task 1: Scaffold project + Docker Compose

**Objective:** `npm create next-app`, docker-compose with PostgreSQL persistent volume, env skeleton.

**Files:**
- Create: `docker-compose.yml`, `.env.example`, `.gitignore`
- Modify: `package.json` (scripts)

**Step 1: Create docker-compose.yml**
```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: api_dashboard
      POSTGRES_USER: dashboard
      POSTGRES_PASSWORD: ${DB_PASSWORD:-demo1234}
    volumes:
      - ./data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
```

**Step 2: Scaffold Next.js**
```bash
npx create-next-app@latest api-dashboard --typescript --tailwind --app --src-dir --import-alias "@/*"
```
Wait — user selected no TS for runtime. Use JS:
```bash
npx create-next-app@latest api-dashboard --tailwind --app --src-dir --import-alias "@/*" --js
```

**Step 3: .env.example**
```
DATABASE_URL="postgresql://dashboard:demo1234@localhost:5432/api_dashboard"
NEXTAUTH_SECRET="change-me"
SLACK_WEBHOOK_URL=""
```

**Step 4: .gitignore** — add `.env`, `data/`, `node_modules/`

**Step 5: npm install + prisma init**
```bash
npm install prisma @prisma/client
npx prisma init
```

**Step 6: Verify**
```bash
docker compose up -d && docker ps | grep postgres
```

**Verification:** `curl localhost:5432` refused = PG running. `cat .env.example` has 3 vars.

---

## Task 2: Prisma schema + migration

**Objective:** API Provider, API Call, Alert Rule models; migration applied.

**Files:**
- Create: `prisma/schema.prisma`
- Modify: `.env` (DATABASE_URL)

**Step 1: Schema**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model ApiProvider {
  id            String   @id @default(cuid())
  name          String
  baseUrl       String
  statusPageUrl String?
  pricingRules  Json     // { endpoint: { method: { costPerRequest: number } } }
  rateLimitRules Json?   // { header: string, quota: number, window: "minute"|"hour"|"day" }
  createdAt     DateTime @default(now())
  calls         ApiCall[]
  alertRules    AlertRule[]
}

model ApiCall {
  id          String   @id @default(cuid())
  providerId  String
  provider    ApiProvider @relation(fields: [providerId], references: [id])
  endpoint    String
  method      String
  statusCode  Int
  latencyMs   Int
  rateLimitRemaining Int?
  estimatedCost Float   @default(0)
  projectTag  String   @default("dev")
  timestamp   DateTime @default(now())
}

model AlertRule {
  id                String   @id @default(cuid())
  providerId        String
  provider          ApiProvider @relation(fields: [providerId], references: [id])
  metricType        String   // "cost" | "rate_limit" | "errors" | "latency" | "downtime"
  threshold         Float
  window            String   // "1h" | "24h" | "7d"
  notificationChannel String // "slack" | "email" | "discord"
  webhookUrl        String?
  enabled           Boolean  @default(true)
  createdAt         DateTime @default(now())
}
```

**Step 2: db push**
```bash
npx prisma db push
```

**Step 3: Generate client**
```bash
npx prisma generate
```

**Verification:** `npx prisma studio` opens (or `npx prisma db seed` test). Schema matches IDEA.md data model.

---

## Task 3: API registry CRUD (4 endpoints)

**Objective:** Create/read/update/delete API providers via REST API routes.

**Files:**
- Create: `app/api/providers/route.js`, `app/api/providers/[id]/route.js`

**Step 1: POST /api/providers** — body: `{ name, baseUrl, pricingRules, rateLimitRules }`. Validate required fields. Return 201 + provider.

**Step 2: GET /api/providers** — list all with call count + last 24h avg latency (aggregation via Prisma).

**Step 3: GET /api/providers/[id]** — single provider + recent 100 calls.

**Step 4: DELETE /api/providers/[id]** — cascade delete calls (Prisma relation cascade).

**Step 5: Seed 5 providers** via `prisma/seed.js`:
- OpenAI (gpt-4: $0.03/1k tokens, gpt-3.5: $0.002/1k)
- Stripe ($0.003/card charge)
- SendGrid ($0.0001/email)
- Twilio ($0.0075/SMS)
- AWS S3 ($0.005/1k PUT)

**Verification:** `curl -X POST localhost:3000/api/providers -d '{"name":"OpenAI","baseUrl":"https://api.openai.com"}'`. GET returns list of 6 (5 seeded + 1 new).

---

## Task 4: Proxy middleware (intercepts calls, emits metrics)

**Objective:** Next.js middleware (or API route `/api/proxy/[provider]`) that forwards requests, parses rate-limit headers, logs call to DB, returns response.

**Files:**
- Create: `app/api/proxy/[providerId]/route.js`
- Create: `lib/proxy-engine.js`

**Step 1: Proxy route** — `GET/POST/PUT/DELETE /api/proxy/:providerId/...` extracts target URL from provider's `baseUrl + path`, forwards with original body/headers (stripping auth — proxy adds its own if needed).

**Step 2: Header parsing** — extract `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`. On 429: respect `Retry-After`, emit call with error metadata.

**Step 3: Metrics emission** — write ApiCall record: `{ providerId, endpoint, method, statusCode, latencyMs, rateLimitRemaining, estimatedCost (from pricingRules), projectTag }`.

**Step 4: Cost calc** — look up provider pricingRules by endpoint+method, multiply by 1 request.

**Verification:** `curl -x localhost:3000/api/proxy/<provider-id>/v1/models`. Check `ApiCall` table has 1 row. Latency > 0.

---

## Task 5: Dashboard UI (React + Tremor charts)

**Objective:** Main page showing API list with live metrics, per-provider detail with charts.

**Files:**
- Create: `app/dashboard/page.jsx`, `components/ApiList.jsx`, `components/MetricCard.jsx`, `components/LatencyChart.jsx`

**Step 1: Layout** — dark theme (matching Onyx Monochrome Precision), full-width grid.

**Step 2: ApiList** — fetches GET /api/providers, renders table: Name | Requests/min | Avg Latency (p50/p95) | Rate Limit Bar | Cost today.

**Step 3: Detail view** — click provider → `/dashboard/[id]` with Tremor AreaChart (latency over time) + BarChart (error rate by status code).

**Step 4: Rate limit bar** — colored bar (green/yellow/red) based on `rateLimitRemaining / quota`.

**Verification:** `npm run dev` → browse to `/dashboard` → 6 providers visible, charts render, no console errors.

---

## Task 6: Alerting engine + Slack webhook

**Objective:** Background check (cron or on-proxy-call) evaluates alert rules; fires Slack webhook on breach.

**Files:**
- Create: `lib/alerts.js`, `app/api/alerts/check/route.js`

**Step 1: Alert evaluation** — for each enabled rule, query calls in window, compute metric (avg error rate, max latency, total cost, min rate limit remaining). If threshold breached → POST to webhookUrl with formatted JSON.

**Step 2: Slack payload** — blocks: "🚨 Alert: OpenAI rate limit at 82% (quota: 1000/min)" with timestamp.

**Step 3: Manual trigger endpoint** — POST `/api/alerts/check` runs all rules; returns fired alerts.

**Step 4: Auto-trigger** — after each proxy call, evaluate that provider's rules only.

**Verification:** Set rule `rate_limit threshold 0.8`, call proxy until 429 → Slack webhook fires (test with webhook.site URL in env).

---

## Task 7: Integration smoke + README

**Objective:** End-to-end test script + portfolio README.

**Files:**
- Create: `scripts/smoke-test.js`, `README.md`

**Step 1: Smoke script** — creates provider via API, calls proxy, checks DB row, fires alert, tears down. Exit 0 on pass.

**Step 2: README** — elevator pitch, architecture diagram (from IDEA.md), `docker-compose up` instructions, screenshot placeholders, tech stack, portfolio links.

**Step 3: Final dev server run** — `npm run dev` on port 3000, all routes respond, PG connected.

**Verification:** `node scripts/smoke-test.js` exits 0. All 7 tasks complete.

---

## Safety & Rollback

- **Blast radius:** Proxy forwards outbound — rate-limit aware, retries bounded (max 3, exponential backoff). No destructive writes to upstream APIs beyond GET unless original method is forwarded.
- **Secrets:** `DATABASE_URL`, `SLACK_WEBHOOK_URL`, `NEXTAUTH_SECRET` in `.env` only. `.env` in `.gitignore`.
- **Rollback:** `docker compose down -v` wipes data — only if dev; prod would use named volume.
- **Schema safety:** Prisma `db push` is dev-only; migration files for prod.

---

## Caveats

- Proxy is request-through; does not intercept SDK-originated calls (that's V2 SDK instrumentation).
- Cost engine uses hardcoded pricing — real-time pricing API scraping is V2.
- Rate-limit header parsing assumes standard `X-RateLimit-*` names; custom headers require provider config.
- No auth on demo — add NextAuth before production.
- Latency p50/p95 computed from last 1000 calls in memory; TSDB migration for scale.

---

## Open Questions (resolved by user)
- [x] Architecture: Next.js full-stack (A)
- [x] DB persistence: `./data/` volume
- [ ] Slack webhook URL — will use webhook.site for dev testing
- [ ] Demo data — seed 5 providers + 100 synthetic calls per provider
