#!/usr/bin/env bash
# Link this repo to a permanent Prisma Postgres database.
# Interactive: opens browser to pick project + database, writes DATABASE_URL to .env
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -n "${PRISMA_SERVICE_TOKEN:-}" ]]; then
  if [[ -z "${PRISMA_DATABASE_ID:-}" ]]; then
    echo "Set PRISMA_DATABASE_ID (e.g. db_...) when using PRISMA_SERVICE_TOKEN."
    exit 1
  fi
  npx prisma postgres link --api-key "$PRISMA_SERVICE_TOKEN" --database "$PRISMA_DATABASE_ID" --force
else
  echo "Opening Prisma login to link a permanent database..."
  echo "Tip: create the project first at https://console.prisma.io"
  npx prisma postgres link --force
fi

echo ""
echo "Linked. Next steps:"
echo "  npm run db:deploy     # migrate + seed"
echo "  npm run db:studio     # browse data"
echo ""
echo "For Netlify, copy DATABASE_URL into Site settings → Environment variables."
