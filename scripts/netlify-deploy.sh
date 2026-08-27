#!/usr/bin/env bash
# Run after: netlify login (or NETLIFY_AUTH_TOKEN is set)
set -euo pipefail
cd "$(dirname "$0")/.."

SITE_ID_OR_NAME="9-16-agency"
AUTH_SECRET="${AUTH_SECRET:-$(openssl rand -hex 32)}"
DATABASE_URL="${DATABASE_URL:-}"
if [[ -z "$DATABASE_URL" && -f /tmp/create-db.json ]]; then
  DATABASE_URL="$(python3 -c 'import json;print(json.load(open("/tmp/create-db.json"))["connectionString"])')"
fi
if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL is required"
  exit 1
fi

echo "Linking site…"
npx netlify link --name "$SITE_ID_OR_NAME" || true

echo "Setting env vars…"
npx netlify env:set DATABASE_URL "$DATABASE_URL" --context production
npx netlify env:set AUTH_SECRET "$AUTH_SECRET" --context production
npx netlify env:set AUTH_URL "https://9-16-agency.netlify.app" --context production
npx netlify env:set AUTH_TRUST_HOST "true" --context production

echo "Also setting for deploy previews…"
npx netlify env:set DATABASE_URL "$DATABASE_URL" --context deploy-preview
npx netlify env:set AUTH_SECRET "$AUTH_SECRET" --context deploy-preview
npx netlify env:set AUTH_TRUST_HOST "true" --context deploy-preview

echo "Building & deploying to production…"
npx netlify deploy --build --prod

echo "Done. Live at https://9-16-agency.netlify.app"
