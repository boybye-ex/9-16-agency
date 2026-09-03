# 9:16 Adds

Full web platform for vertical ads: AI images, CapCut-style video editing, captions, scripts, and social analytics for agency teams and clients.

## Quick start

```bash
npm install
cp .env.example .env
npm run db:link      # link permanent Prisma Postgres (see docs/DATABASE.md)
npm run db:deploy    # migrate + seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo logins

| Role | Email | Password |
|------|-------|----------|
| Agency admin | agency@916adds.com | agency123 |
| Agency team | team@916adds.com | member123 |
| Client | client@916adds.com | client123 |

## Database

**Permanent Postgres:** use Prisma Console + `npm run db:link`.  
Full guide: [docs/DATABASE.md](docs/DATABASE.md)

| Command | Purpose |
|---------|---------|
| `npm run db:link` | Connect `.env` to Prisma Postgres |
| `npm run db:deploy` | Migrate + seed (local or CI) |
| `npm run db:studio` | Browse data in the browser |

## Features

- Marketing site + authenticated app in one Next.js project
- AI image generation (Pollinations; works without API keys)
- Video editor with timeline, trim/split, text overlays, export
- AI captions and script improvement (Groq / OpenAI when keys are set; smart fallbacks otherwise)
- Instagram / TikTok / Facebook account connect + performance insights + AI posting recommendations
- Agency client workspaces and invites

## Environment

Copy `.env.example` to `.env`:

- `DATABASE_URL` — Postgres (set by `npm run db:link` or Neon)
- `AUTH_SECRET` — session secret
- `AUTH_URL` — your site URL (e.g. `https://9-16-agency.netlify.app`)
- `AUTH_TRUST_HOST` — `true`
- `OPENAI_API_KEY` or `GROQ_API_KEY` — optional live LLM
- Meta / TikTok keys — optional live social OAuth

## Deploy (Netlify)

Production: [https://9-16-agency.netlify.app](https://9-16-agency.netlify.app)

Build settings in `netlify.toml` (Next.js plugin + Prisma migrate/seed).

Required Netlify environment variables:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `AUTH_TRUST_HOST=true`

After linking a new database locally, copy `DATABASE_URL` to Netlify and redeploy.
