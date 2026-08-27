# 9:16 Adds

Full web platform for vertical ads: AI images, CapCut-style video editing, captions, scripts, and social analytics for agency teams and clients.

## Quick start

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo logins

| Role | Email | Password |
|------|-------|----------|
| Agency admin | agency@916adds.com | agency123 |
| Agency team | team@916adds.com | member123 |
| Client | client@916adds.com | client123 |

## Features

- Marketing site + authenticated app in one Next.js project
- AI image generation (Pollinations; works without API keys)
- Video editor with timeline, trim/split, text overlays, export
- AI captions and script improvement (Groq / OpenAI when keys are set; smart fallbacks otherwise)
- Instagram / TikTok / Facebook account connect + performance insights + AI posting recommendations
- Agency client workspaces and invites

## Environment

Copy `.env.example` to `.env`:

- `DATABASE_URL` — SQLite by default
- `AUTH_SECRET` — session secret
- `OPENAI_API_KEY` or `GROQ_API_KEY` — optional live LLM
- `META_APP_ID` / `META_APP_SECRET` — optional live Meta OAuth
- `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` — optional live TikTok OAuth

## Brand colours

- Primary: `#02060e`
- Secondary: `#c50337`, `#00bbff`
- Tertiary: `#fafafa`
