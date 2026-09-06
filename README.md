# Next.js 14 API Dashboard MVP

## Quick Start

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
docker compose up -d
npm run dev
```

## Architecture

- **Frontend:** Next.js App Router + React 18 + Tailwind 3
- **Proxy:** Middleware at `/api/proxy/[providerId]/*`
- **Registry:** REST API routes in `app/api/providers/`
- **DB:** PostgreSQL 16 via Docker Compose, persisted to `./data/`
- **Alerts:** Slack webhook via `app/api/alerts/check`
