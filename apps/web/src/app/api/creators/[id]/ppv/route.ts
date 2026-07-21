import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'

const { creator, ppvContent } = schema

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'ppv')
const MAX_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES: Record<string, 'photo' | 'video'> = {
  'image/jpeg': 'photo',
  'image/png': 'photo',
  'image/webp': 'photo',
  'video/mp4': 'video',
}

// POST /api/creators/[id]/ppv
// Uploads a blurred teaser + posts it in the creator's Telegram channel with
// an inline "Unlock" button. The original full-res file must be uploaded
// separately (fullFileUrl passed in) — this endpoint does not generate the
// blur itself, the creator uploads an already-blurred preview.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const c = await db.query.creator.findFirst({ where: eq(creator.id, id) })
  if (!c) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  if (c.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!c.telegramChannelId) {
    return NextResponse.json({ error: 'Canal do Telegram não configurado' }, { status: 400 })
  }

  const formData = await req.formData().catch(() => null)
  const previewFile = formData?.get('preview')
  const fullFile = formData?.get('full')
  const title = formData?.get('title')
  const priceCents = Number(formData?.get('priceCents'))
  const currency = String(formData?.get('currency') ?? 'usd').toLowerCase()

  if (!(previewFile instanceof File) || !(fullFile instanceof File)) {
    return NextResponse.json({ error: 'Envie a prévia borrada e o arquivo original' }, { status: 400 })
  }
  if (!Number.isFinite(priceCents) || priceCents < 100) {
    return NextResponse.json({ error: 'Preço inválido' }, { status: 400 })
  }
  const mediaType = ALLOWED_TYPES[previewFile.type]
  if (!mediaType) {
    return NextResponse.json({ error: 'Formato de prévia inválido' }, { status: 400 })
  }
  if (previewFile.size > MAX_SIZE || fullFile.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 50MB.' }, { status: 400 })
  }

  await mkdir(UPLOAD_DIR, { recursive: true })

  const fullExt = fullFile.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin'
  const fullFilename = `${randomUUID()}.${fullExt}`
  await writeFile(path.join(UPLOAD_DIR, fullFilename), Buffer.from(await fullFile.arrayBuffer()))
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'
  const fullFileUrl = `${appUrl}/ppv/${fullFilename}`

  const contentId = randomUUID()

  // Post the blurred teaser to the channel with the "Unlock" inline button.
  // We send the preview as multipart directly to Telegram (not our own URL)
  // since it's small and avoids a public-facing intermediate file.
  const previewBytes = Buffer.from(await previewFile.arrayBuffer())
  const tgForm = new FormData()
  tgForm.set('chat_id', c.telegramChannelId)
  tgForm.set(mediaType === 'photo' ? 'photo' : 'video', new Blob([previewBytes], { type: previewFile.type }), previewFile.name)
  tgForm.set('has_spoiler', 'true')
  if (title) tgForm.set('caption', String(title))
  tgForm.set(
    'reply_markup',
    JSON.stringify({ inline_keyboard: [[{ text: `🔓 Desbloquear`, callback_data: `unlock:${contentId}` }]] }),
  )

  const botToken = process.env['TELEGRAM_BOT_TOKEN']
  const tgRes = await fetch(
    `https://api.telegram.org/bot${botToken}/${mediaType === 'photo' ? 'sendPhoto' : 'sendVideo'}`,
    { method: 'POST', body: tgForm },
  )
  const tgData = await tgRes.json()
  if (!tgData.ok) {
    console.error('[ppv] failed to post teaser to channel:', tgData)
    return NextResponse.json({ error: 'Falha ao publicar no canal do Telegram' }, { status: 502 })
  }

  const previewFileId: string | undefined =
    tgData.result?.photo?.at(-1)?.file_id ?? tgData.result?.video?.file_id
  if (!previewFileId) {
    return NextResponse.json({ error: 'Telegram não retornou file_id da prévia' }, { status: 502 })
  }

  await db.insert(ppvContent).values({
    id: contentId,
    creatorId: id,
    title: title ? String(title) : null,
    priceCents,
    currency,
    mediaType,
    previewFileId,
    fullFileUrl,
  })

  return NextResponse.json({ id: contentId }, { status: 201 })
}

// GET /api/creators/[id]/ppv — list PPV content for this creator
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const c = await db.query.creator.findFirst({ where: eq(creator.id, id) })
  if (!c) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  if (c.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const items = await db.query.ppvContent.findMany({
    where: eq(ppvContent.creatorId, id),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  })

  return NextResponse.json(items)
}
