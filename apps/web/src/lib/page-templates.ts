export type PageConfig = {
  accentColor: string
  bgFrom: string
  bgTo: string
  bgMid?: string
  cardBg: string
  cardBorder: string
  textColor: string
  mutedColor: string
  fontFamily: string
  glowOpacity: number
  avatarRing: string     // conic gradient or solid color for the avatar ring
  buttonStyle: 'pill' | 'rounded' | 'sharp'
  layout: 'centered' | 'wide'
}

export type Template = {
  id: string
  name: string
  description: string
  preview: string        // emoji or color swatch
  config: PageConfig
}

export const PAGE_TEMPLATES: Template[] = [
  {
    id: 'neon-dark',
    name: 'Neon Dark',
    description: 'Dark com glow neon vibrante',
    preview: '🌸',
    config: {
      accentColor: '#ec4899',
      bgFrom: '#2a1230',
      bgTo: '#0a0a0c',
      cardBg: 'rgba(236,72,153,.1)',
      cardBorder: 'rgba(236,72,153,.25)',
      textColor: '#ffffff',
      mutedColor: '#c4c4cc',
      fontFamily: 'system-ui',
      glowOpacity: 0.4,
      avatarRing: 'conic-gradient(from 0deg, #ec4899, #7c3aed, #f472b6, #a78bfa, #ec4899)',
      buttonStyle: 'pill',
      layout: 'centered',
    },
  },
  {
    id: 'rose-glam',
    name: 'Rose Glam',
    description: 'Rosa & dourado com estilo luxo',
    preview: '🌹',
    config: {
      accentColor: '#f43f5e',
      bgFrom: '#1a0a0f',
      bgTo: '#0d0008',
      bgMid: '#200c14',
      cardBg: 'rgba(244,63,94,.08)',
      cardBorder: 'rgba(244,63,94,.2)',
      textColor: '#fdf2f8',
      mutedColor: '#fda4af',
      fontFamily: 'Georgia, serif',
      glowOpacity: 0.35,
      avatarRing: 'conic-gradient(from 0deg, #f43f5e, #d4a574, #f43f5e, #fbbf24, #f43f5e)',
      buttonStyle: 'rounded',
      layout: 'centered',
    },
  },
  {
    id: 'minimal-white',
    name: 'Minimal White',
    description: 'Clean e minimalista em branco',
    preview: '🤍',
    config: {
      accentColor: '#18181b',
      bgFrom: '#ffffff',
      bgTo: '#f4f4f5',
      cardBg: 'rgba(0,0,0,.04)',
      cardBorder: 'rgba(0,0,0,.1)',
      textColor: '#18181b',
      mutedColor: '#71717a',
      fontFamily: 'system-ui',
      glowOpacity: 0,
      avatarRing: '#18181b',
      buttonStyle: 'sharp',
      layout: 'centered',
    },
  },
  {
    id: 'gradient-sunset',
    name: 'Sunset',
    description: 'Laranja e roxo ao pôr do sol',
    preview: '🌅',
    config: {
      accentColor: '#f97316',
      bgFrom: '#1c0a00',
      bgTo: '#0d0018',
      bgMid: '#2d0f00',
      cardBg: 'rgba(249,115,22,.1)',
      cardBorder: 'rgba(249,115,22,.25)',
      textColor: '#fff7ed',
      mutedColor: '#fed7aa',
      fontFamily: 'system-ui',
      glowOpacity: 0.4,
      avatarRing: 'conic-gradient(from 0deg, #f97316, #ec4899, #a855f7, #f97316)',
      buttonStyle: 'pill',
      layout: 'centered',
    },
  },
  {
    id: 'ocean-deep',
    name: 'Ocean Deep',
    description: 'Azul profundo com brilho cyan',
    preview: '🌊',
    config: {
      accentColor: '#06b6d4',
      bgFrom: '#020c1b',
      bgTo: '#010509',
      bgMid: '#041020',
      cardBg: 'rgba(6,182,212,.08)',
      cardBorder: 'rgba(6,182,212,.2)',
      textColor: '#f0f9ff',
      mutedColor: '#7dd3fc',
      fontFamily: 'system-ui',
      glowOpacity: 0.35,
      avatarRing: 'conic-gradient(from 0deg, #06b6d4, #3b82f6, #06b6d4, #0ea5e9, #06b6d4)',
      buttonStyle: 'rounded',
      layout: 'centered',
    },
  },
  {
    id: 'forest-dark',
    name: 'Forest',
    description: 'Verde esmeralda no escuro',
    preview: '🌿',
    config: {
      accentColor: '#10b981',
      bgFrom: '#021208',
      bgTo: '#010804',
      bgMid: '#041a0a',
      cardBg: 'rgba(16,185,129,.08)',
      cardBorder: 'rgba(16,185,129,.2)',
      textColor: '#f0fdf4',
      mutedColor: '#86efac',
      fontFamily: 'system-ui',
      glowOpacity: 0.3,
      avatarRing: 'conic-gradient(from 0deg, #10b981, #065f46, #34d399, #10b981)',
      buttonStyle: 'rounded',
      layout: 'centered',
    },
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    description: 'Roxo profundo estilo galáxia',
    preview: '🔮',
    config: {
      accentColor: '#8b5cf6',
      bgFrom: '#0f0523',
      bgTo: '#05020d',
      bgMid: '#160835',
      cardBg: 'rgba(139,92,246,.1)',
      cardBorder: 'rgba(139,92,246,.25)',
      textColor: '#faf5ff',
      mutedColor: '#c4b5fd',
      fontFamily: 'system-ui',
      glowOpacity: 0.4,
      avatarRing: 'conic-gradient(from 0deg, #8b5cf6, #ec4899, #a78bfa, #6d28d9, #8b5cf6)',
      buttonStyle: 'pill',
      layout: 'centered',
    },
  },
  {
    id: 'blush-soft',
    name: 'Blush Soft',
    description: 'Rosa suave e feminino',
    preview: '🌸',
    config: {
      accentColor: '#fb7185',
      bgFrom: '#fff0f3',
      bgTo: '#fce7f3',
      cardBg: 'rgba(251,113,133,.08)',
      cardBorder: 'rgba(251,113,133,.2)',
      textColor: '#1f0a10',
      mutedColor: '#9f1239',
      fontFamily: 'Georgia, serif',
      glowOpacity: 0.15,
      avatarRing: 'conic-gradient(from 0deg, #fb7185, #f9a8d4, #fda4af, #fb7185)',
      buttonStyle: 'pill',
      layout: 'centered',
    },
  },
  {
    id: 'noir',
    name: 'Noir',
    description: 'Preto e branco elegante',
    preview: '🖤',
    config: {
      accentColor: '#ffffff',
      bgFrom: '#000000',
      bgTo: '#111111',
      cardBg: 'rgba(255,255,255,.06)',
      cardBorder: 'rgba(255,255,255,.12)',
      textColor: '#ffffff',
      mutedColor: '#a1a1aa',
      fontFamily: 'Georgia, serif',
      glowOpacity: 0,
      avatarRing: 'conic-gradient(from 0deg, #ffffff, #71717a, #ffffff)',
      buttonStyle: 'sharp',
      layout: 'centered',
    },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Gradiente violeta e magenta com brilho suave',
    preview: '🌌',
    config: {
      accentColor: '#a78bfa',
      bgFrom: '#26162e',
      bgTo: '#0a0a0c',
      bgMid: '#1c1024',
      cardBg: 'rgba(167,139,250,.08)',
      cardBorder: 'rgba(167,139,250,.22)',
      textColor: '#ffffff',
      mutedColor: '#c4c4cc',
      fontFamily: 'system-ui',
      glowOpacity: 0.3,
      avatarRing: 'conic-gradient(from 135deg, #7c3aed, #ec4899, #f472b6, #7c3aed)',
      buttonStyle: 'pill',
      layout: 'centered',
    },
  },
  {
    id: 'cover',
    name: 'Cover',
    description: 'Tons escuros sóbrios com destaque rosa/violeta',
    preview: '🎬',
    config: {
      accentColor: '#ec4899',
      bgFrom: '#181820',
      bgTo: '#0a0a0c',
      bgMid: '#12121a',
      cardBg: 'rgba(255,255,255,.04)',
      cardBorder: 'rgba(255,255,255,.08)',
      textColor: '#ffffff',
      mutedColor: '#a1a1aa',
      fontFamily: 'system-ui',
      glowOpacity: 0.2,
      avatarRing: 'conic-gradient(from 0deg, #ec4899, #7c3aed)',
      buttonStyle: 'rounded',
      layout: 'centered',
    },
  },
  {
    id: 'neon-spotlight',
    name: 'Neon Spotlight',
    description: 'Preto com holofote rosa intenso e anel giratório',
    preview: '✨',
    config: {
      accentColor: '#ec4899',
      bgFrom: '#2a1230',
      bgTo: '#05020a',
      bgMid: '#1a0a20',
      cardBg: 'rgba(236,72,153,.1)',
      cardBorder: 'rgba(236,72,153,.28)',
      textColor: '#ffffff',
      mutedColor: '#f9a8d4',
      fontFamily: 'system-ui',
      glowOpacity: 0.55,
      avatarRing: 'conic-gradient(from 0deg, #ec4899, #7c3aed, #f472b6, #a78bfa, #ec4899)',
      buttonStyle: 'pill',
      layout: 'centered',
    },
  },
]

export function getTemplate(id: string): Template {
  return PAGE_TEMPLATES.find((t) => t.id === id) ?? PAGE_TEMPLATES[0]!
}

export function resolveConfig(templateId: string, overrides?: Partial<PageConfig> | null): PageConfig {
  const base = getTemplate(templateId).config
  if (!overrides) return base
  return { ...base, ...overrides }
}
