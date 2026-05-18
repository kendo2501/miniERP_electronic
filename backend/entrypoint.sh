#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy --schema ./database/prisma/schema.prisma

echo "Checking seed status..."
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count().then(n => {
  if (n === 0) {
    console.log('Empty database — running seed...');
    require('./dist/seeds/seed.js');
  } else {
    console.log('Database already seeded (' + n + ' users), skipping.');
    process.exit(0);
  }
}).catch(e => { console.error('Seed check failed:', e.message); process.exit(0); });
"

echo "Starting application..."
exec node dist/main
