# Creators feature — link-in-bio pages + click tracking

Drop-in package for **nfsw-ai-studio** (`apps/web`, App Router, Drizzle, Better Auth,
TanStack Query, `@repo/ui` shadcn slate-dark). It adds:

- **`/creators`** — authenticated dashboard to manage one link-in-bio page per
  content creator, with 30-day click metrics and a per-platform tracking panel.
- **`/p/[slug]`** — the public link-in-bio page (the "Babi Barelli" Neon Spotlight
  design), server-rendered with ISR + SEO metadata + `next/image`.
- **`/r/[linkId]`** — redirect endpoint that records every outbound click, then
  302s to the destination. This is what makes the tracking work.

Everything matches the repo's existing conventions: Drizzle (`db.query` / `db.insert`),
`randomUUID()` ids, `auth.api.getSession({ headers })` guards, `NextResponse`,
`@repo/ui` components, lucide icons, Portuguese UI copy.

---

## File map (paths are relative to the repo root)

```
packages/db/src/creators.ts                         ← new tables (creator, creatorLink, linkClick)
apps/web/src/lib/creators.ts                        ← PLATFORMS, slugify, API types
apps/web/src/app/api/creators/route.ts              ← GET list + POST create
apps/web/src/app/api/creators/[id]/route.ts         ← GET detail + PATCH + DELETE
apps/web/src/app/r/[linkId]/route.ts                ← click-tracking redirect
apps/web/src/app/(app)/creators/page.tsx            ← dashboard (client)
apps/web/src/app/p/[slug]/page.tsx                  ← public page (server, ISR)
apps/web/src/components/navigation.tsx              ← UPDATED: adds the "Criadoras" tab
```

Patches (apply by hand — they touch existing files):

```
patches/schema.ts.patch.md          ← add 3 tables to the schema export
patches/globals.css.append.css      ← append the 3 keyframes used by /p/[slug]
```

> Note: `apps/web/src/app/p/` sits **outside** the `(app)` and `(landing)` route
> groups on purpose — the public page must not inherit the authed `Navigation`
> chrome. Next.js serves it at `/p/[slug]` regardless.

---

## Install

1. **Copy the files** into the repo at the paths above (overwrite `navigation.tsx`).
2. **Schema** — follow `patches/schema.ts.patch.md`, then generate + run the
   Drizzle migration (creates `creator`, `creator_link`, `link_click`).
3. **CSS** — append `patches/globals.css.append.css` to
   `packages/ui/src/globals.css`.
4. **Avatars** — the public page uses `next/image` with `creator.avatarUrl`. For
   remote hosts add them to `images.remotePatterns` in `apps/web/next.config.ts`
   (the GCS bucket is the natural place to store creator photos — reuse
   `@repo/gcs-storage` for uploads).
5. `pnpm dev` → visit `/creators`, create a page, publish it (`status: 'live'`),
   then open `/p/{slug}`.

---

## How tracking works

```
Public page button  →  /r/{linkId}  →  INSERT link_click  →  302 to real URL
                                         (fire-and-forget;
                                          never blocks the user)
```

- `link_click.creatorId` is **denormalised** so per-creator aggregation needs no
  join (see the indexes in `creators.ts`).
- Dashboard metrics are computed live with SQL `count(*)` + `date_trunc('day', …)`
  windows (30d totals, 30d-vs-prior-30d % change, 12-bucket sparkline, 14-day
  series, per-platform breakdown). For high traffic, swap the live queries for a
  nightly rollup table (`link_click_daily`) — the route shapes stay identical.

---

## Lighthouse notes (public page)

- LCP: avatar is `next/image` with `priority` + explicit `sizes="132px"` → no CLS.
- Fonts: the app already loads Inter via `next/font` — no extra render-blocking.
- A11y: `alt` on the avatar, `aria-label` on the verified badge, `aria-hidden` on
  the glow, AA contrast (white on `#0a0a0c`).
- Motion: all entrance/loop animations are gated behind
  `@media (prefers-reduced-motion: reduce)`.
- Add `rel="noopener noreferrer"` if you later point links straight at external
  URLs instead of through `/r/[linkId]`.

---

## Suggested commit / PR

```bash
git checkout -b feat/creators-link-pages
# copy files + apply patches + run migration
git add .
git commit -m "feat(creators): link-in-bio pages with per-platform click tracking"
git push -u origin feat/creators-link-pages
# open the PR on GitHub
```
