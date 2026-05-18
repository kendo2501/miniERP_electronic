FROM node:22-alpine AS base
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY package.json ./
RUN npm install --omit=dev

# ---- build ----
FROM base AS build
COPY package.json ./
RUN npm install
COPY . .
# NEXT_PUBLIC_API_URL: leave empty for self-hosted (same-domain nginx)
# or pass --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com for Vercel-style split
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# ---- production ----
FROM base AS production
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1
CMD ["node", "server.js"]
