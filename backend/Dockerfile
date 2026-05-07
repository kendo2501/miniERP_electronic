FROM node:22-alpine AS base
WORKDIR /app

# ---- deps ----
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

# ---- production ----
FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/database ./backend/database
COPY backend/package.json ./backend/

WORKDIR /app/backend
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "dist/main"]
