# Database setup — 9:16 Adds

Permanent Postgres for local dev and Netlify production.

## Option A — Prisma Console + `prisma postgres link` (recommended)

### 1. Create a permanent database

1. Go to [Prisma Console](https://console.prisma.io)
2. Create a workspace (if needed)
3. **New project** → **PostgreSQL** → pick a region close to your users (e.g. `us-east-1`)
4. Wait until the database status is **Ready**

### 2. Link this repo

From the project root:

```bash
npm install
npm run db:link
```

This runs `prisma postgres link`, opens your browser, and writes `DATABASE_URL` into `.env`.

**Non-interactive (CI / agents):**

```bash
export PRISMA_SERVICE_TOKEN="your-service-token"   # Console → Settings → Service tokens
export PRISMA_DATABASE_ID="db_..."                 # Console → your database ID
npm run db:link
```

### 3. Migrate and seed

```bash
npm run db:deploy
npm run db:studio   # optional — visual data browser
```

### 4. Production (Netlify)

1. Copy `DATABASE_URL` from `.env`
2. Netlify → **Site settings → Environment variables**
3. Set `DATABASE_URL` for **Production** (and deploy previews if you want)
4. Redeploy the site

Build already runs:

```bash
npx prisma generate && npx prisma migrate deploy && npm run db:seed && next build
```

---

## Option B — Neon (alternative)

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the **pooled** connection string into `.env`:

```env
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
```

3. Run `npm run db:deploy`
4. Paste the same URL into Netlify env vars

No `prisma postgres link` step — you manage the URL yourself.

---

## Useful commands

| Command | What it does |
|--------|----------------|
| `npm run db:link` | Link `.env` to Prisma Postgres (permanent) |
| `npm run db:deploy` | Apply migrations + seed demo users |
| `npm run db:migrate` | Create a new migration in dev |
| `npm run db:seed` | Seed demo users only |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Reset local DB (destructive) |

---

## Demo logins (after seed)

| Role | Email | Password |
|------|-------|----------|
| Agency | agency@916adds.com | agency123 |
| Team | team@916adds.com | member123 |
| Client | client@916adds.com | client123 |

Change these before giving real clients access.

---

## Troubleshooting

**“Project check failed — resource-not-found”**  
The old **temporary** `create-db` project expired or was never claimed. Create a **permanent** project in Prisma Console and run `npm run db:link` again.

**Login works locally but not on Netlify**  
Check Netlify `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, and `AUTH_TRUST_HOST=true`.

**Prisma MCP (optional)**  
Prisma 7 includes `npx prisma mcp` for Cursor/AI tools. Useful later; not required for day-to-day dev.
