FROM node:22-alpine AS base
WORKDIR /app

# ---- deps (prod only, no devDeps) ----
FROM base AS deps
COPY package.json ./
RUN npm install --omit=dev

# ---- build ----
FROM base AS build
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate --schema ./database/prisma/schema.prisma
RUN npm run build
RUN npx tsc --project tsconfig.seed.json

# ---- production ----
FROM base AS production
ENV NODE_ENV=production

RUN apk add --no-cache openssl

# prod deps from deps stage; Prisma binaries from build stage (generated for Alpine)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma

COPY --from=build /app/dist ./dist
COPY --from=build /app/database ./database
COPY package.json ./
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-${APP_PORT:-3000}}/health || exit 1
CMD ["./entrypoint.sh"]
