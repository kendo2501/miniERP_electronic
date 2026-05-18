FROM node:22-alpine AS base
WORKDIR /app

# ---- deps (prod only, no devDeps) ----
FROM base AS deps
COPY backend/package.json ./backend/
WORKDIR /app/backend
RUN npm install --omit=dev

# ---- build ----
FROM base AS build
COPY backend/package.json ./backend/
WORKDIR /app/backend
RUN npm install
COPY backend/ .
RUN npx prisma generate --schema ./database/prisma/schema.prisma
RUN npm run build
RUN npx tsc --project tsconfig.seed.json

# ---- production ----
FROM base AS production
ENV NODE_ENV=production

# OpenSSL required by Prisma migration engine (schema-engine binary) on Alpine
RUN apk add --no-cache openssl

# node_modules: prod deps from `deps`, but Prisma-specific from `build`
# (prisma generate in build stage downloads correct Linux Alpine engine binaries)
COPY --from=deps /app/backend/node_modules ./backend/node_modules
# Prisma: @prisma/client + .prisma/client (generated) + prisma CLI — all from build stage
COPY --from=build /app/backend/node_modules/@prisma ./backend/node_modules/@prisma
COPY --from=build /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY --from=build /app/backend/node_modules/prisma ./backend/node_modules/prisma

COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/database ./backend/database
COPY backend/package.json ./backend/

WORKDIR /app/backend
COPY backend/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1
CMD ["./entrypoint.sh"]
