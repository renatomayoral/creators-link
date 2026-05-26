# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:24-alpine AS deps
RUN npm install -g pnpm@11.3.0
WORKDIR /app

# Copy workspace manifests for dependency resolution
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./

# Copy all package.json files (pnpm needs them to resolve workspace deps)
COPY apps/web/package.json                ./apps/web/
COPY packages/auth/package.json           ./packages/auth/
COPY packages/db/package.json             ./packages/db/
COPY packages/payments/package.json       ./packages/payments/
COPY packages/shared/package.json         ./packages/shared/
COPY packages/ui/package.json             ./packages/ui/
COPY packages/cloud-infra/package.json    ./packages/cloud-infra/
COPY packages/comfyui-client/package.json ./packages/comfyui-client/
COPY packages/gcs-storage/package.json    ./packages/gcs-storage/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
RUN npm install -g pnpm@11.3.0
WORKDIR /app

COPY --from=deps /app/node_modules                    ./node_modules
COPY --from=deps /app/apps/web/node_modules           ./apps/web/node_modules
# Copy packages node_modules so PostCSS / Tailwind plugins resolve correctly
COPY --from=deps /app/packages/ui/node_modules        ./packages/ui/node_modules
COPY --from=deps /app/packages/auth/node_modules      ./packages/auth/node_modules
COPY --from=deps /app/packages/db/node_modules        ./packages/db/node_modules
COPY --from=deps /app/packages/payments/node_modules  ./packages/payments/node_modules

# Copy source
COPY . .

# Build only the web app (no DATABASE_URL needed at build time — lazy connection)
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @repo/web build

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Cloud Run injects PORT=8080
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# standalone output includes everything needed to run
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static     ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public            ./apps/web/public

USER nextjs
EXPOSE 8080

# server.js is at apps/web/server.js inside the standalone folder
CMD ["node", "apps/web/server.js"]
