import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, schema } from '@repo/db'
import { sendMessage, answerCallbackQuery } from '@/lib/telegram-bot'
import { createPayLink } from '@/lib/boomfi'

const { ppvContent, ppvPurchase, creator } = schema

type TelegramUpdate = {
  callback_query?: {
    id: string
    data?: string
    from: { id: number }
    message?: { chat: { id: number } }
  }
}

// POST /api/telegram/webhook
// Receives Telegram Bot API updates. Handles the "Unlock" inline button tap
// on a PPV teaser post: creates a BoomFi pay link and DMs it to the fan.
// Registered via setWebhook — see scripts/telegram-set-webhook.mjs.
export async function POST(req: NextRequest) {
  const secretHeader = req.headers.get('x-telegram-bot-api-secret-token')
  if (secretHeader !== process.env['TELEGRAM_WEBHOOK_SECRET']) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const update: TelegramUpdate = await req.json().catch(() => ({}))
  const cb = update.callback_query
  if (!cb?.data?.startsWith('unlock:')) {
    return NextResponse.json({ ok: true })
  }

  const contentId = cb.data.slice('unlock:'.length)
  const telegramUserId = String(cb.from.id)

  const content = await db.query.ppvContent.findFirst({ where: eq(ppvContent.id, contentId) })
  if (!content) {
    await answerCallbackQuery({ callbackQueryId: cb.id, text: 'Conteúdo não encontrado.', showAlert: true })
    return NextResponse.json({ ok: true })
  }

  const c = await db.query.creator.findFirst({ where: eq(creator.id, content.creatorId) })

  try {
    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'
    const purchaseId = randomUUID()

    const payLink = await createPayLink({
      amount: content.priceCents / 100,
      currency: content.currency,
      orderId: purchaseId,
      description: `${c?.name ?? 'PPV'} — ${content.title ?? 'conteúdo exclusivo'}`,
      redirectUrl: `${appUrl}/p/${c?.slug ?? ''}`,
    })

    await db.insert(ppvPurchase).values({
      id: purchaseId,
      ppvContentId: content.id,
      creatorId: content.creatorId,
      telegramUserId,
      status: 'pending',
    })

    await sendMessage({
      chatId: telegramUserId,
      text: `Pague para desbloquear: ${payLink.url}`,
    })

    await answerCallbackQuery({ callbackQueryId: cb.id, text: 'Link enviado no seu privado!' })
  } catch (err) {
    console.error('[telegram/webhook] failed to create unlock pay link:', err)
    await answerCallbackQuery({
      callbackQueryId: cb.id,
      text: 'Erro ao gerar cobrança. Tente novamente.',
      showAlert: true,
    })
  }

  return NextResponse.json({ ok: true })
}
