import { z } from 'zod'

// ── Schema ───────────────────────────────────────────────────────────────────

export const generateSchema = z.object({
  prompt:         z.string().min(3, 'Prompt deve ter ao menos 3 caracteres'),
  negativePrompt: z.string().optional(),
  width:          z.number().min(256).max(2048),
  height:         z.number().min(256).max(2048),
  steps:          z.number().min(1).max(100),
  cfg:            z.number().min(1).max(30),
  seed:           z.number().min(0),
  frames:         z.number().min(16).max(200).optional(),
})

export type GenerateForm = z.infer<typeof generateSchema>

export type JobStatus = {
  status:      'pending' | 'running' | 'completed' | 'failed'
  percentage?: number
  outputUrl?:  string
  outputType?: 'image' | 'video'
}

// ── Presets ───────────────────────────────────────────────────────────────────

export const IMAGE_PRESETS = [
  { label: 'Retrato',  w: 832,  h: 1216, icon: '▯' },
  { label: 'Quadrado', w: 1024, h: 1024, icon: '▢' },
  { label: 'Paisagem', w: 1216, h: 832,  icon: '▭' },
  { label: 'Wide',     w: 1344, h: 768,  icon: '▬' },
] as const

export const VIDEO_PRESETS = [
  { label: '16:9', w: 832, h: 480, icon: '▬' },
  { label: '9:16', w: 480, h: 832, icon: '▯' },
  { label: '1:1',  w: 480, h: 480, icon: '▢' },
] as const

export const FRAME_PRESETS = [
  { label: '~2s', frames: 49 },
  { label: '~3s', frames: 73 },
  { label: '~4s', frames: 97 },
] as const
