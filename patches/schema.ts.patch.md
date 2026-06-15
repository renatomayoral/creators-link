# Patch: packages/db/src/schema.ts

The new tables live in `packages/db/src/creators.ts` (copied from this package).
Make Drizzle aware of them by adding them to the `schema` export object in
`packages/db/src/schema.ts`.

## 1. Add the import at the top of schema.ts

```ts
import { creator, creatorLink, linkClick } from './creators'
```

## 2. Add the three tables to the `schema` export object (bottom of schema.ts)

```ts
export const schema = {
  user,
  session,
  account,
  verification,
  subscription,
  userProfile,
  usageQuota,
  anonymousSession,
  // ── creators feature ──
  creator,
  creatorLink,
  linkClick,
}
```

That's the only change to the existing file. The lazy `() => user.id` foreign-key
references in `creators.ts` resolve correctly despite the circular import, because
they are thunks evaluated at migration time, not at module load.

## 3. Generate & apply the migration

This repo uses **Drizzle Kit** (`drizzle.config.ts` + postgres-js). From `packages/db`:

```bash
pnpm drizzle-kit generate   # emits SQL for creator / creator_link / link_click
pnpm drizzle-kit migrate    # applies it (or: drizzle-kit push for dev)
```

(Use whatever script aliases already exist in `packages/db/package.json` — e.g.
`pnpm db:generate` / `pnpm db:migrate` if defined.)
