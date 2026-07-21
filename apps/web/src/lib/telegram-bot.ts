// Telegram Bot API client — thin wrapper over the raw HTTP API used
// throughout the codebase (createChatInviteLink, setChatPhoto, getChat, ...).
// Centralizes the fetch/error-handling boilerplate for the bot-facing calls
// added for PPV unlock (sendPhoto/sendVideo, answerCallbackQuery, setWebhook).

function botToken(): string {
  const token = process.env['TELEGRAM_BOT_TOKEN']
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set')
  return token
}

async function call<T>(method: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${botToken()}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`Telegram API error (${method}): ${JSON.stringify(data)}`)
  return data.result
}

export type InlineKeyboardButton = { text: string; callback_data?: string; url?: string }

export async function sendMessage(params: {
  chatId: string | number
  text: string
  inlineKeyboard?: InlineKeyboardButton[][]
}): Promise<{ message_id: number }> {
  return call('sendMessage', {
    chat_id: params.chatId,
    text: params.text,
    reply_markup: params.inlineKeyboard ? { inline_keyboard: params.inlineKeyboard } : undefined,
  })
}

export async function sendPhoto(params: {
  chatId: string | number
  photo: string // file_id, URL, or file path token
  caption?: string
  hasSpoiler?: boolean
}): Promise<{ message_id: number }> {
  return call('sendPhoto', {
    chat_id: params.chatId,
    photo: params.photo,
    caption: params.caption,
    has_spoiler: params.hasSpoiler,
  })
}

export async function sendVideo(params: {
  chatId: string | number
  video: string
  caption?: string
  hasSpoiler?: boolean
}): Promise<{ message_id: number }> {
  return call('sendVideo', {
    chat_id: params.chatId,
    video: params.video,
    caption: params.caption,
    has_spoiler: params.hasSpoiler,
  })
}

export async function answerCallbackQuery(params: {
  callbackQueryId: string
  text?: string
  showAlert?: boolean
}): Promise<void> {
  await call('answerCallbackQuery', {
    callback_query_id: params.callbackQueryId,
    text: params.text,
    show_alert: params.showAlert,
  })
}

export async function setWebhook(url: string, secretToken?: string): Promise<void> {
  await call('setWebhook', { url, secret_token: secretToken })
}
