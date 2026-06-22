import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { auth } from '@repo/auth'

const { creator } = schema
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'avatars')
const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// POST /api/upload/channel-photo?creatorId=xxx
// Saves the photo locally, updates creator.channelPhotoUrl, and applies it to
// the Telegram channel via setChatPhoto if the channel is already connected.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creatorId = req.nextUrl.searchParams.get('creatorId')

  const formData = await req.formData().catch(() => null)
  const file = formData?.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Formato inválido. Use JPG, PNG ou WebP.' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 5MB.' }, { status: 400 })
  }

  await mkdir(UPLOAD_DIR, { recursive: true })
  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  const filename = `channel-${randomUUID()}.${ext}`
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  await writeFile(path.join(UPLOAD_DIR, filename), buffer)
  const url = `/avatars/${filename}`

  // Persist on creator if creatorId provided and owned by this user
  let telegramChannelId: string | null = null
  if (creatorId) {
    const c = await db.query.creator.findFirst({ where: eq(creator.id, creatorId) })
    if (c && c.userId === session.user.id) {
      await db.update(creator).set({ channelPhotoUrl: url, updatedAt: new Date() }).where(eq(creator.id, creatorId))
      telegramChannelId = c.telegramChannelId ?? null
    }
  }

  // Apply photo to Telegram channel if connected
  const botToken = process.env['TELEGRAM_BOT_TOKEN']
  let telegramApplied = false
  if (botToken && telegramChannelId) {
    try {
      const form = new FormData()
      form.append('chat_id', telegramChannelId)
      form.append('photo', new Blob([buffer], { type: file.type }), filename)
      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/setChatPhoto`, {
        method: 'POST',
        body: form,
      })
      const tgData = await tgRes.json()
      telegramApplied = tgData.ok === true
    } catch {
      // non-fatal — photo is saved locally regardless
    }
  }

  return NextResponse.json({ url, telegramApplied }, { status: 201 })
}
