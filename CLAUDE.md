# Creators Link — Contexto do Projeto

Monorepo com Turborepo + Next.js 16 para o **Creators Link** (creatorslink.org): SaaS de
link-in-bio para criadoras de conteúdo adulto. Cada criadora tem uma página pública
(`/p/[slug]`) com links para suas plataformas (OnlyFans, Fansly, Fanvue, Patreon, Telegram),
tracking de cliques, planos VIP com cobrança via Stripe/BoomFi (cripto)/PIX, e um
dashboard autenticado para gerenciar tudo.

O antigo produto "AI Studio" (ComfyUI + Wan 2.2 + FLUX.1 na GCP/RunPod) **foi descontinuado
e a infraestrutura foi deletada**. Não recriar essas referências — hoje só existe o app
`apps/web` (Creators Link).

## Projeto GCP

- **ID**: `mktia-ai-studio` ← usar SEMPRE em comandos gcloud (nome do projeto é legado, mas é o projeto correto)
- **Organização**: liberlaser.com (ID: 1055618027140)
- **Billing Account**: FYGRAPH (01E2E4-6D42DB-07D06C)
- **Bucket**: `mktia-ai-studio-outputs` (uploads de avatar/foto de canal)
- **Auth local**: `gcloud auth application-default login` (sem service account key file)
- **Cloud Run service**: `creatorslink` (região `us-central1`), domínio `creatorslink.org`
- **Service account de deploy**: `cloudrun-web@mktia-ai-studio.iam.gserviceaccount.com`

## GitHub

- **Repo**: `renatomayoral/creators-link`

## Deploy

- `cloudbuild.web.yaml` builda `Dockerfile` (raiz), publica em
  `us-central1-docker.pkg.dev/mktia-ai-studio/creators-link/web` e faz deploy no Cloud Run
  service `creatorslink`.
- Secrets usados no deploy (Secret Manager, nomes em MAIÚSCULAS): `DATABASE_URL`,
  `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_SPARK`, `STRIPE_PRICE_CREATOR`, `STRIPE_PRICE_PRO`,
  `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_USER_AUTH_STRING`, `TELEGRAM_BOT_TOKEN`,
  `TELEGRAM_WEBHOOK_SECRET`, `BOOMFI_API_KEY`, `BOOMFI_WEBHOOK_PUBLIC_KEY`,
  `BOOMFI_PARTNERS_API_KEY`, `BOOMFI_PARTNERS_SIGNING_SECRET`, `BOOMFI_PLATFORM_ACCOUNT_REF`,
  `CRON_SECRET`.
- Não há trigger automático de Cloud Build configurado — builds/deploys são disparados
  manualmente (`gcloud builds submit --config=cloudbuild.web.yaml`).
- `cloudbuild.yaml` (raiz, sem `.web`) e `.github/workflows/docker-build.yml` são resquícios
  do antigo produto AI Studio (build de imagem ComfyUI) — não usados pelo `apps/web`.

---

## Stack Tecnológica

- **Next.js 16** com App Router e Server Components
- **TypeScript** em todo o monorepo (strict mode)
- **Tailwind CSS v4**
- **shadcn/ui** (`packages/ui` compartilhado + `apps/web`)
- **Turborepo** como build system
- **pnpm workspaces** como package manager
- **Zod** para validação
- **Better Auth** (`@repo/auth`) + `@better-auth/stripe` para auth e billing
- **Drizzle ORM** (`@repo/db`) sobre Postgres
- **Stripe** para assinaturas fiat; **BoomFi** para cripto; PIX (`@repo/payments`)
- **@repo/onlyfans-client** — integração não-oficial com OnlyFans (sessão via cookie/bookmarklet)
- **@mtkruto/node** — client Telegram (criação/verificação de canal)
- **Zustand** para state management
- **TanStack Query v5** para data fetching
- **react-hook-form** + **@hookform/resolvers** para formulários
- **@dnd-kit** para drag-and-drop (reordenar links)
- **next-intl** (`i18n/`) para internacionalização

---

## Estrutura do Monorepo

```text
creators-link/
├── apps/
│   └── web/                          # Next.js 16 — dashboard + páginas públicas + API
├── packages/
│   ├── auth/                         # @repo/auth — Better Auth (server + client)
│   ├── db/                           # @repo/db — Drizzle schema + client
│   ├── onlyfans-client/              # @repo/onlyfans-client — integração OnlyFans
│   ├── payments/                     # @repo/payments — Stripe + plans
│   ├── shared/                       # @repo/shared — tipos e utilitários
│   └── ui/                           # @repo/ui — shadcn/ui componentes compartilhados
├── scripts/
├── Dockerfile                        # imagem do apps/web (produção)
├── cloudbuild.web.yaml               # build + deploy Cloud Run (creatorslink)
├── cloudbuild.yaml                   # legado (AI Studio, não usado)
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env
└── README.md
```

---

## packages/db — Schema principal (Drizzle)

- **Auth/Better Auth**: `user`, `session`, `account`, `verification`, `subscription`,
  `userProfile`, `usageQuota`, `anonymousSession`, `referral` (`schema.ts`)
- **Creators**: `platform`, `creator`, `creatorLink`, `linkClick`, `vipPlan`,
  `vipPlanPrice`, `vipSubscription`, `payment`, `platformToken` (`creators.ts`)

## packages/auth

- Better Auth server config + client hooks. Sessão via `auth.api.getSession({ headers })`.

## packages/payments

- `stripe/` — checkout, Connect (onboarding de criadoras), webhooks, billing portal
- `plans.ts` — definição dos planos (Free/Creator/Pro) e da taxa por transação
  (`TAKE_RATE_BPS`) que decresce conforme o plano — ver tabela em
  creatorslink.org/#precos. `STRIPE_PRICE_SPARK` ficou sem uso: o plano Free
  não tem Stripe Price (é o tier padrão sem assinatura).

Nota: a cobrança cripto (BoomFi) vive em `apps/web/src/lib/boomfi.ts`, não neste pacote.

## packages/onlyfans-client

- `client.ts`, `cookie-parser.ts`, `headers.ts` — sessão via cookie/bookmarklet, stats

---

## apps/web — Áreas principais

### `(landing)` — página pública de marketing

### `(auth)` — login/signup (Better Auth + Google OAuth)

### `(app)` — dashboard autenticado

- `/creators` — CRUD de páginas de criadoras, métricas de cliques (30 dias)
- `/settings`, onboarding de Stripe Connect e plataformas (OnlyFans/Fansly/Fanvue/Patreon/Telegram)

### `/p/[slug]` — página pública de link-in-bio

- Fora dos grupos `(app)`/`(landing)` de propósito — não herda o chrome autenticado
- Server-rendered com ISR + SEO metadata + `next/image`

### `/r/[linkId]` — redirect com tracking de clique

- Registra o clique em `linkClick` e faz 302 para o destino

### `/generate`, `/library`

- Resquícios da era AI Studio — confirmar se ainda em uso antes de expandir

---

## apps/web — API Routes (visão geral)

```text
/api/auth/[...all]                       Better Auth (todas as rotas de auth)
/api/creators, /api/creators/[id]         CRUD de páginas de criadora
/api/creators/[id]/links(...)             Links da página (+ reorder)
/api/creators/[id]/plans(...)             Planos VIP
/api/creators/[id]/crypto/(setup|withdraw) Configuração/saque cripto
/api/creators/[id]/domain                 Domínio customizado
/api/creators/[id]/page-design            Template/design da página
/api/creators/[id]/connect                Conectar plataforma externa
/api/onboarding/*                         Onboarding (Stripe Connect, plataformas, status)
/api/checkout, /api/checkout/crypto       Checkout fiat/cripto
/api/webhooks/(stripe|boomfi|c6bank)      Webhooks de pagamento
/api/onlyfans/*, /api/fansly/*, /api/fanvue/*, /api/patreon/*  Integrações de plataforma
/api/telegram/*                           Criação/verificação de canal Telegram
/api/pix/charge, /api/boomfi/*             Cobrança PIX / cripto avulsa e recorrente
/api/dashboard/*                          Saldo Stripe, transações
/api/upload/(avatar|channel-photo)        Upload de imagens
/api/domain-detect                        Detecção de domínio customizado
/api/cron/crypto-renewal-reminder         Cron (autenticado via CRON_SECRET)
/api/referral                             Programa de indicação
```

---

## Variáveis de Ambiente

Ver `.env` (não commitado) para valores reais. Chaves principais:

```text
DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL
NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_APP_DOMAIN
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_SPARK, STRIPE_PRICE_CREATOR, STRIPE_PRICE_PRO
BOOMFI_API_KEY, BOOMFI_WEBHOOK_PUBLIC_KEY
BOOMFI_PARTNERS_API_KEY, BOOMFI_PARTNERS_SIGNING_SECRET, BOOMFI_PLATFORM_ACCOUNT_REF
FANVUE_CLIENT_ID, FANVUE_CLIENT_SECRET
PATREON_CLIENT_ID, PATREON_CLIENT_SECRET
TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_BOT_TOKEN, TELEGRAM_USER_AUTH_STRING
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
RESEND_API_KEY, RESEND_FROM
CRON_SECRET
```

---

## Dependências — Convenções

- **Sempre usar a versão mais recente** de todas as dependências. Ao adicionar ou atualizar qualquer pacote, usar `pnpm add <pkg>@latest` ou `pnpm update --recursive --latest`.
- Nunca fixar versões antigas sem motivo explícito. Se uma versão específica for necessária por incompatibilidade, documentar o motivo com um comentário no `package.json`.
- Após atualizar, rodar `pnpm --filter web exec tsc --noEmit` para checar breaking changes de tipos.
- Quando o Stripe SDK atualizar, ajustar `apiVersion` em `packages/payments/src/index.ts` para a versão exigida pelo tipo.

---

## Banco de Dados — Convenções

- **SEMPRE** usar `drizzle-kit generate` + `drizzle-kit migrate` para aplicar mudanças no schema
- **NUNCA** usar `drizzle-kit push` — push bypassa o histórico de migrations e não é adequado para produção
- **Claude Code**: sempre que alterar `packages/db/src/*.ts` (schema), rodar `cd packages/db && pnpm drizzle-kit generate` logo em seguida — não pular essa etapa.
  - Se a mudança for só adição de coluna/tabela nova (sem ambiguidade), o comando roda direto, sem prompt.
  - Se a mudança envolver algo que pode ser interpretado como rename (remover uma coluna e adicionar outra parecida, mudar nome de coluna/tabela), o drizzle-kit abre um prompt interativo ("essa coluna foi renomeada?") que exige TTY — e o ambiente de execução do Claude Code não tem TTY, então o comando falha com `Interactive prompts require a TTY terminal`. Nesse caso, avisar o usuário explicitamente que a migration não pôde ser gerada por essa limitação e pedir para ele rodar o comando no terminal dele (escolhendo drop+add, não rename, quando as colunas antigas não devem ser preservadas).

```bash
cd packages/db && pnpm drizzle-kit generate
cd packages/db && pnpm drizzle-kit migrate
```

**Problema conhecido:** o `drizzle-kit migrate` às vezes reporta "applied successfully" mas não executa o SQL nem registra a migration na tabela `drizzle.__drizzle_migrations`. Após rodar o migrate, sempre verificar:

```bash
node --env-file=.env -e "import('postgres').then(async ({default:pg})=>{const sql=pg(process.env.DATABASE_URL);const m=await sql\`SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at\`;console.log(m.map(r=>r.hash).join(', '));await sql.end()})"
```

Se a migration não aparecer, aplicar o SQL manualmente e registrar na tabela:

```sql
-- Executar o SQL do arquivo .sql manualmente, depois:
INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('0002_nome_da_migration', <timestamp_do_journal>);
```

---

## Convenções de Código

- Sem tokens/chaves hardcoded — sempre variáveis de ambiente
- Scripts shell com `set -e` + verificações explícitas
- Strict TypeScript em todo o monorepo
- Imports de componentes: `import { Button } from "@repo/ui/components/button"`
- Todas as API routes validam input com Zod
- Sem `console.log` em produção — usar `console.error` apenas em catch blocks
