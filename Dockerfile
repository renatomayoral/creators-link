# syntax=docker/dockerfile:1

# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate
WORKDIR /app

# Copy only manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/payments/package.json ./packages/payments/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .

# Only public vars at build time — secrets are injected at runtime by Cloud Run
ARG NEXT_PUBLIC_APP_DOMAIN=creatorslink.org
ARG NEXT_PUBLIC_APP_URL=https://creatorslink.org
ENV NEXT_PUBLIC_APP_DOMAIN=$NEXT_PUBLIC_APP_DOMAIN
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Placeholders so the build doesn't crash when route page-data collection
# instantiates these clients at module scope. Real values are injected at
# runtime via Secret Manager. Written to .env.production because Next.js'
# page-data-collection workers only inherit vars it loads from .env files
# itself, not arbitrary Docker ENV / process.env.
RUN printf 'DATABASE_URL=postgresql://placeholder:placeholder@localhost/placeholder\nBETTER_AUTH_SECRET=placeholder-build-secret\nRESEND_API_KEY=re_placeholder\n' > apps/web/.env.production

RUN pnpm turbo build --filter=@repo/web

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
