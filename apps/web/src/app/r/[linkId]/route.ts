import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'

const { creatorLink, linkClick } = schema

// ─── GET /r/[linkId] — record a click, then 302 to the destination ───────────
// This is the URL every button on a public /p/[slug] page points to, so each
// outbound tap is attributed to a (creator, link) pair.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const { linkId } = await params

  const link = await db.query.creatorLink.findFirst({
    where: eq(creatorLink.id, linkId),
  })

  // Unknown/disabled link → bounce home rather than error.
  if (!link || !link.active) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Fire-and-forget the click insert; never block the redirect on it.
  void db
    .insert(linkClick)
    .values({
      id: randomUUID(),
      linkId: link.id,
      creatorId: link.creatorId,
      referrer: req.headers.get('referer'),
      country: req.headers.get('x-vercel-ip-country') ?? req.headers.get('cf-ipcountry'),
      userAgent: req.headers.get('user-agent'),
    })
    .catch((err) => console.error('[track] failed to record click', err))

  return NextResponse.redirect(link.url, { status: 302 })
}
