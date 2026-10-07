#!/bin/sh
set -eu
npx prisma migrate deploy
if [ "${SEED_DEMO:-false}" = "true" ]; then
  node scripts/seed.cjs --demo
else
  node scripts/seed.cjs
fi
exec node dist/main.js
