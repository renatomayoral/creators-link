import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingNav } from './_components/landing-nav'

export const metadata: Metadata = {
  title: 'CreatorsLink — Páginas de links + analytics para criadoras',
  description:
    'Crie páginas de links lindas para cada criadora e acompanhe, por plataforma, exatamente de onde vêm os cliques — OnlyFans, Privacy, Instagram e mais, num painel só.',
  robots: { index: true, follow: true },
}

const ACCENT = '#ec4899'

// ─── SVGs inline ─────────────────────────────────────────────────────────────
function IconLink() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="#fff"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
    </svg>
  )
}
function IconArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="#fff"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}
function IconCheck({ color = '#34d399' }: { color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}
function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none">
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  )
}

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'As páginas têm verificação de idade?',
    a: 'Sim. As páginas já vêm com selo 18+, prévias com cadeado e um card de destaque para a assinatura — feitas para criadoras de conteúdo premium, respeitando as regras de cada plataforma.',
  },
  {
    q: 'Como o rastreio de cliques funciona?',
    a: 'Cada botão da página passa por um link de redirecionamento que registra o clique (criadora + plataforma) e, em seguida, leva a pessoa ao destino real. É instantâneo e invisível para quem clica.',
  },
  {
    q: 'Como funcionam as vendas no Telegram?',
    a: 'Você conecta seu bot, cria planos VIP (mensal, trimestral, anual) e a plataforma cuida do resto: o assinante paga por Pix ou cartão, é adicionado ao seu canal ou grupo automaticamente e removido quando o plano expira — tudo sem você sair do painel.',
  },
  {
    q: 'Como recebo os pagamentos?',
    a: 'O recebimento é integrado: aceitamos Pix e cartão e o valor das assinaturas cai direto pra você, sem precisar de outra ferramenta de cobrança. Você acompanha assinantes e receita no mesmo painel dos cliques.',
  },
  {
    q: 'Preciso saber programar?',
    a: 'Não. Você cria uma criadora pelo nome, ajusta os links e a cor de destaque pelo painel e publica. Nenhuma linha de código.',
  },
  {
    q: 'Posso usar meu próprio domínio?',
    a: 'Sim, a partir do plano Pro. Aponte seu domínio e as páginas ficam em seudominio.com/p/nome, com a sua marca e sem logo de terceiros.',
  },
  {
    q: 'Dá para gerenciar várias criadoras?',
    a: 'Sim. Uma única conta gerencia várias páginas, cada uma com seu rastreio. O plano Agência libera criadoras ilimitadas e acesso para o time.',
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div
      style={{
        background: '#020817',
        fontFamily: 'Inter,system-ui,sans-serif',
        color: '#f8fafc',
        overflowX: 'hidden',
      }}
    >
      {/* ── NAV ── */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          borderBottom: '1px solid #11203a',
          background: 'rgba(2,8,23,.72)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: '0 24px',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            gap: 32,
          }}
        >
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              color: '#f8fafc',
              textDecoration: 'none',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-wordmark-dark.svg" alt="Creators Link" height={28} style={{ height: 28, width: 'auto' }} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            {[
              ['#recursos', 'Recursos'],
              ['#como', 'Como funciona'],
              ['#precos', 'Preços'],
              ['#faq', 'Dúvidas'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                style={{
                  padding: '8px 13px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#94a3b8',
                  textDecoration: 'none',
                }}
              >
                {label}
              </a>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              href="/login"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#cbd5e1',
                padding: '8px 6px',
                textDecoration: 'none',
              }}
            >
              Entrar
            </Link>
            <Link
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 16px',
                borderRadius: 9,
                background: ACCENT,
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: `0 8px 22px -8px ${ACCENT}`,
              }}
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <header id="top" style={{ position: 'relative' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -120,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 760,
            height: 560,
            maxWidth: '130vw',
            background: `radial-gradient(circle,${ACCENT} 0%,transparent 62%)`,
            opacity: 0.32,
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'relative',
            maxWidth: 1180,
            margin: '0 auto',
            padding: '84px 24px 72px',
            display: 'flex',
            gap: 56,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {/* copy */}
          <div style={{ flex: '1 1 440px', minWidth: 320 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 9,
                padding: '6px 13px',
                borderRadius: 999,
                background: 'rgba(236,72,153,.1)',
                border: '1px solid rgba(236,72,153,.28)',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#f9a8d4',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#34d399',
                  boxShadow: '0 0 8px #34d399',
                }}
              />
              Link na bio + analytics para criadoras
            </div>
            <h1
              style={{
                margin: '22px 0 0',
                fontSize: 'clamp(38px,5.4vw,60px)',
                lineHeight: 1.04,
                fontWeight: 900,
                letterSpacing: '-.03em',
              }}
            >
              Sua bio vira{' '}
              <span
                style={{
                  background: `linear-gradient(120deg,${ACCENT},#a78bfa)`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                venda
              </span>
              .<br />
              Cada clique vira{' '}
              <span
                style={{
                  background: `linear-gradient(120deg,#60a5fa,${ACCENT})`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                dado
              </span>
              .
            </h1>
            <p
              style={{
                margin: '22px 0 0',
                maxWidth: 480,
                fontSize: 17,
                lineHeight: 1.65,
                color: '#a3b1c6',
              }}
            >
              Crie páginas de links lindas para cada criadora e acompanhe, por plataforma,
              exatamente de onde vêm os cliques — OnlyFans, Privacy, Instagram e mais, num painel
              só.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 13, marginTop: 30 }}>
              <Link
                href="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '14px 22px',
                  borderRadius: 11,
                  background: ACCENT,
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: `0 14px 30px -10px ${ACCENT}`,
                }}
              >
                Começar grátis <IconArrow />
              </Link>
              <a
                href="#como"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '14px 22px',
                  borderRadius: 11,
                  background: 'rgba(255,255,255,.05)',
                  border: '1px solid #1e293b',
                  color: '#e2e8f0',
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <IconPlay /> Ver demo
              </a>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                marginTop: 26,
                fontSize: 13,
                color: '#64748b',
              }}
            >
              {['Publica em 60s', 'Sem cartão', '100% no Lighthouse'].map((t) => (
                <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <IconCheck /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* visual */}
          <div style={{ flex: '1 1 420px', minWidth: 320, position: 'relative' }}>
            {/* dashboard card */}
            <div
              style={{
                borderRadius: 20,
                border: '1px solid #1e293b',
                background: '#0b1220',
                boxShadow: '0 40px 90px -30px rgba(0,0,0,.7)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '12px 15px',
                  borderBottom: '1px solid #1e293b',
                }}
              >
                {['#ef4444', '#f59e0b', '#22c55e'].map((c) => (
                  <span
                    key={c}
                    style={{ width: 11, height: 11, borderRadius: '50%', background: c }}
                  />
                ))}
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 12,
                    color: '#64748b',
                    fontFamily: 'ui-monospace,monospace',
                  }}
                >
                  creatorslink.org/criadoras
                </span>
              </div>
              <div style={{ padding: 18 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <div
                    style={{ flex: 1, border: '1px solid #1e293b', borderRadius: 12, padding: 12 }}
                  >
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Cliques · 30d</div>
                    <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>45.300</div>
                    <div style={{ fontSize: 11, color: '#34d399', fontWeight: 600, marginTop: 2 }}>
                      +9,7%
                    </div>
                  </div>
                  <div
                    style={{ flex: 1, border: '1px solid #1e293b', borderRadius: 12, padding: 12 }}
                  >
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Top plataforma</div>
                    <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>OnlyFans</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      52% dos cliques
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 9 }}>
                  Cliques · 14 dias
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 5,
                    height: 84,
                    paddingBottom: 12,
                    borderBottom: '1px solid #1e293b',
                  }}
                >
                  {[42, 55, 48, 66, 58, 78, 64, 88, 74, 100].map((h, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        borderRadius: '3px 3px 0 0',
                        height: `${h}%`,
                        background: 'linear-gradient(180deg,#60a5fa,#3b82f6)',
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
                  {[
                    { label: 'OnlyFans', color: '#ec4899', pct: 52 },
                    { label: 'Instagram', color: '#dd2a7b', pct: 27 },
                    { label: 'TikTok', color: '#38bdf8', pct: 21 },
                  ].map(({ label, color, pct }) => (
                    <div key={label}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 12,
                          marginBottom: 5,
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span
                            style={{ width: 8, height: 8, borderRadius: 2, background: color }}
                          />
                          {label}
                        </span>
                        <span style={{ color: '#94a3b8' }}>{pct}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 99, background: '#131c2e' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            borderRadius: 99,
                            background: color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* floating phone */}
            <div
              style={{
                position: 'absolute',
                bottom: -34,
                right: -14,
                width: 176,
                borderRadius: 26,
                padding: 7,
                background: 'linear-gradient(160deg,#26262b,#121214)',
                boxShadow: `0 30px 60px -20px rgba(236,72,153,.5)`,
                animation: 'lpfloat 8s ease-in-out infinite',
              }}
            >
              <div
                style={{
                  borderRadius: 20,
                  background: 'radial-gradient(180px 150px at 50% 0%,#2a1230,#0a0a0c 62%)',
                  padding: '20px 14px 16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ width: 64, height: 64, margin: '0 auto', position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: `conic-gradient(from 0deg,${ACCENT},#7c3aed,#f472b6,#a78bfa,${ACCENT})`,
                      animation: 'lpspin 6s linear infinite',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 3,
                      borderRadius: '50%',
                      background: '#0a0a0c',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 6,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg,#6d5dfc,#22d3ee)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 900,
                      color: '#fff',
                    }}
                  >
                    B
                  </div>
                </div>
                <div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, color: '#fff' }}>
                  Babi Barelli
                </div>
                <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    style={{
                      padding: 8,
                      borderRadius: 9,
                      background: `linear-gradient(135deg,${ACCENT},#7c3aed)`,
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: '#fff',
                    }}
                  >
                    OnlyFans
                  </div>
                  <div
                    style={{
                      padding: 8,
                      borderRadius: 9,
                      background: 'rgba(255,255,255,.05)',
                      border: '1px solid rgba(255,255,255,.08)',
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: '#e2e8f0',
                    }}
                  >
                    Instagram
                  </div>
                  <div
                    style={{
                      padding: 8,
                      borderRadius: 9,
                      background: 'rgba(255,255,255,.05)',
                      border: '1px solid rgba(255,255,255,.08)',
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: '#e2e8f0',
                    }}
                  >
                    Privacy
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── STATS STRIP ── */}
      <section
        style={{
          borderTop: '1px solid #11203a',
          borderBottom: '1px solid #11203a',
          background: '#060d1c',
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: '30px 24px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            justifyContent: 'space-between',
            textAlign: 'center',
          }}
        >
          {[
            { val: '45 mil+', label: 'cliques rastreados' },
            { val: '5', label: 'plataformas integradas' },
            { val: '60s', label: 'para publicar uma página' },
            { val: '100%', label: 'score no Lighthouse' },
          ].map(({ val, label }) => (
            <div key={label} style={{ flex: '1 1 160px' }}>
              <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-.02em' }}>{val}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section
        id="recursos"
        style={{ maxWidth: 1180, margin: '0 auto', padding: '90px 24px 30px' }}
      >
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: ACCENT,
            }}
          >
            Recursos
          </div>
          <h2
            style={{
              margin: '14px 0 0',
              fontSize: 'clamp(28px,3.6vw,40px)',
              fontWeight: 800,
              letterSpacing: '-.02em',
            }}
          >
            Tudo que uma criadora precisa numa bio só
          </h2>
          <p style={{ margin: '14px 0 0', fontSize: 16, lineHeight: 1.6, color: '#a3b1c6' }}>
            Página feita pra converter e rastreio que prova o que funciona — sem planilha, sem
            achismo.
          </p>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))',
            gap: 18,
            marginTop: 48,
          }}
        >
          {[
            {
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke={ACCENT}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="5" y="2" width="14" height="20" rx="3" />
                  <path d="M9 18h6" />
                </svg>
              ),
              bg: 'rgba(236,72,153,.12)',
              border: 'rgba(236,72,153,.25)',
              title: 'Páginas que convertem',
              desc: 'Dark com neon, foto, verificado, card de destaque e prévias. Mobile-first e carrega num piscar.',
            },
            {
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 3v18h18" />
                  <path d="M18 9l-5 5-3-3-4 4" />
                </svg>
              ),
              bg: 'rgba(59,130,246,.12)',
              border: 'rgba(59,130,246,.25)',
              title: 'Rastreio por plataforma',
              desc: 'Cada botão passa por um redirect que conta o clique. Veja OnlyFans, Privacy, Instagram e mais, lado a lado.',
            },
            {
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="#a78bfa"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              ),
              bg: 'rgba(124,58,237,.12)',
              border: 'rgba(124,58,237,.25)',
              title: 'Multi-criadora',
              desc: 'Gerencie dezenas de criadoras numa conta. Sparkline, top link e status de cada página num relance.',
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="#34d399" stroke="none">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9z" />
                </svg>
              ),
              bg: 'rgba(52,211,153,.12)',
              border: 'rgba(52,211,153,.25)',
              title: 'Rápido e otimizado',
              desc: 'Next.js, next/image e SEO no capricho. 100% no Lighthouse e pronto pra escalar com seu tráfego.',
            },
            {
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke={ACCENT}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
                </svg>
              ),
              bg: 'rgba(236,72,153,.12)',
              border: 'rgba(236,72,153,.25)',
              title: 'Sua marca, seu domínio',
              desc: 'Cor de destaque por criadora, bio e domínio próprio. A página é sua — sem logo de terceiros.',
            },
            {
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              ),
              bg: 'rgba(59,130,246,.12)',
              border: 'rgba(59,130,246,.25)',
              title: 'Pronto para conteúdo premium',
              desc: 'Selo de verificação de idade, prévias com cadeado e card de destaque para a assinatura. Tudo configurado para converter.',
            },
          ].map(({ icon, bg, border, title, desc }) => (
            <div
              key={title}
              style={{
                border: '1px solid #1e293b',
                borderRadius: 18,
                background: '#0b1220',
                padding: 26,
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: bg,
                  border: `1px solid ${border}`,
                }}
              >
                {icon}
              </div>
              <h3 style={{ margin: '18px 0 0', fontSize: 18, fontWeight: 700 }}>{title}</h3>
              <p style={{ margin: '9px 0 0', fontSize: 14.5, lineHeight: 1.6, color: '#94a3b8' }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="como" style={{ maxWidth: 1180, margin: '0 auto', padding: '80px 24px 30px' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: ACCENT,
            }}
          >
            Como funciona
          </div>
          <h2
            style={{
              margin: '14px 0 0',
              fontSize: 'clamp(28px,3.6vw,40px)',
              fontWeight: 800,
              letterSpacing: '-.02em',
            }}
          >
            Da ideia ao primeiro clique em 3 passos
          </h2>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
            gap: 18,
            marginTop: 48,
          }}
        >
          {[
            {
              n: '01',
              title: 'Crie por nome',
              desc: (
                <>
                  Digite o nome da criadora. Geramos o link{' '}
                  <code style={{ fontFamily: 'ui-monospace,monospace', color: '#cbd5e1' }}>
                    /p/nome
                  </code>{' '}
                  e os botões das plataformas automaticamente.
                </>
              ),
            },
            {
              n: '02',
              title: 'Personalize e publique',
              desc: 'Ajuste os links, a cor de destaque, a foto e a bio. Publique e a página fica no ar na hora.',
            },
            {
              n: '03',
              title: 'Acompanhe os cliques',
              desc: 'Compartilhe o link na bio. Veja cliques por dia e por plataforma, em tempo real, no painel.',
            },
          ].map(({ n, title, desc }) => (
            <div
              key={n}
              style={{
                border: '1px solid #1e293b',
                borderRadius: 18,
                background: '#0b1220',
                padding: 28,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: ACCENT }}>{n}</div>
              <h3 style={{ margin: '12px 0 0', fontSize: 19, fontWeight: 700 }}>{title}</h3>
              <p style={{ margin: '9px 0 0', fontSize: 14.5, lineHeight: 1.6, color: '#94a3b8' }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SHOWCASE ── */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '80px 24px 30px' }}>
        <div
          style={{
            border: '1px solid #1e293b',
            borderRadius: 24,
            background: 'linear-gradient(160deg,#0b1220,#070e1c)',
            padding: 'clamp(28px,5vw,56px)',
            display: 'flex',
            gap: 48,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div style={{ flex: '1 1 360px', minWidth: 300 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: '#60a5fa',
              }}
            >
              Painel de rastreio
            </div>
            <h2
              style={{
                margin: '14px 0 0',
                fontSize: 'clamp(26px,3.2vw,36px)',
                fontWeight: 800,
                letterSpacing: '-.02em',
              }}
            >
              Saiba qual plataforma realmente traz dinheiro
            </h2>
            <p style={{ margin: '16px 0 0', fontSize: 16, lineHeight: 1.65, color: '#a3b1c6' }}>
              Pare de adivinhar. Cada clique é atribuído a uma criadora e a uma plataforma, então
              você sabe onde investir tempo e tráfego.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginTop: 24 }}>
              {[
                {
                  text: (
                    <>
                      <strong style={{ color: '#fff' }}>Cliques por plataforma</strong> — ranking
                      com % e barras comparativas.
                    </>
                  ),
                },
                {
                  text: (
                    <>
                      <strong style={{ color: '#fff' }}>Tendência diária</strong> — 14 dias de série
                      e variação vs. período anterior.
                    </>
                  ),
                },
                {
                  text: (
                    <>
                      <strong style={{ color: '#fff' }}>Visão por criadora</strong> — compare
                      páginas e descubra o top link de cada uma.
                    </>
                  ),
                },
              ].map(({ text }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                  <IconCheck />
                  <span style={{ fontSize: 14.5, color: '#cbd5e1', lineHeight: 1.55 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: '1 1 340px', minWidth: 300 }}>
            <div
              style={{
                border: '1px solid #1e293b',
                borderRadius: 16,
                background: '#0b1220',
                padding: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1' }}>
                  Cliques por plataforma · 30d
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>35.300 total</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'OnlyFans', color: '#ec4899', n: '18.420', pct: 52, bar: 100 },
                  { label: 'Instagram', color: '#dd2a7b', n: '9.530', pct: 27, bar: 52 },
                  { label: 'TikTok', color: '#38bdf8', n: '4.760', pct: 13, bar: 26 },
                  { label: 'Fanvue', color: '#6d5dfc', n: '1.620', pct: 5, bar: 12 },
                  { label: 'Privacy', color: '#ff5a5f', n: '970', pct: 3, bar: 8 },
                ].map(({ label, color, n, pct, bar }) => (
                  <div key={label}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 13,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}
                      >
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: color }} />
                        {label}
                      </span>
                      <span style={{ color: '#94a3b8' }}>
                        <strong style={{ color: '#f8fafc' }}>{n}</strong> · {pct}%
                      </span>
                    </div>
                    <div style={{ height: 7, borderRadius: 99, background: '#131c2e' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${bar}%`,
                          borderRadius: 99,
                          background: color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TELEGRAM ── */}
      <section
        id="telegram"
        style={{ maxWidth: 1180, margin: '0 auto', padding: '80px 24px 30px' }}
      >
        <div
          style={{
            border: '1px solid #15324a',
            borderRadius: 24,
            background: 'linear-gradient(160deg,#08263b,#070e1c 62%)',
            padding: 'clamp(28px,5vw,56px)',
            display: 'flex',
            gap: 52,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {/* chat mock */}
          <div style={{ flex: '1 1 360px', minWidth: 300, order: 2 }}>
            <div
              style={{
                maxWidth: 380,
                margin: '0 auto',
                borderRadius: 22,
                border: '1px solid #1e3a52',
                background: '#0e1621',
                boxShadow: '0 40px 90px -30px rgba(34,158,217,.45)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '13px 16px',
                  background: 'linear-gradient(120deg,#229ED9,#1c8bc0)',
                }}
              >
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff">
                    <path d="M21.9 4.3l-3.1 14.6c-.2 1-.9 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-.9.5l.3-4.5L18 6.2c.4-.3-.1-.5-.6-.2L7.2 12.6l-4.4-1.4c-1-.3-1-.9.2-1.4l17.2-6.6c.8-.3 1.5.2 1.2 1.4z" />
                  </svg>
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                    CreatorsLink Bot
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.8)' }}>
                    bot · gerencia seu VIP
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,.85)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span
                    style={{ width: 6, height: 6, borderRadius: '50%', background: '#6ee7b7' }}
                  />
                  online
                </span>
              </div>
              <div
                style={{
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  background: '#0e1621',
                }}
              >
                <div
                  style={{
                    alignSelf: 'flex-start',
                    maxWidth: '88%',
                    background: '#182533',
                    borderRadius: '14px 14px 14px 4px',
                    padding: '11px 13px',
                  }}
                >
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: '#e8eef4' }}>
                    Olá! 💎 Escolha seu plano para entrar no{' '}
                    <strong style={{ color: '#5cc6f0' }}>Canal VIP da Babi</strong>:
                  </div>
                </div>
                <div
                  style={{
                    alignSelf: 'flex-start',
                    width: '88%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 7,
                  }}
                >
                  {[
                    { label: '💎 VIP Mensal', price: 'R$29,90', featured: false },
                    { label: '🔥 VIP Trimestral', price: 'R$74,90', featured: false },
                    { label: '⭐ VIP Anual', price: 'R$249', featured: true },
                  ].map(({ label, price, featured }) => (
                    <div
                      key={label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '11px 13px',
                        borderRadius: 11,
                        background: featured
                          ? 'linear-gradient(120deg,#229ED9,#1c8bc0)'
                          : '#1d2b3a',
                        border: `1px solid ${featured ? '#2fa8e0' : '#294258'}`,
                        boxShadow: featured ? '0 8px 20px -8px rgba(34,158,217,.7)' : undefined,
                      }}
                    >
                      <span
                        style={{ fontSize: 13, fontWeight: featured ? 700 : 600, color: '#fff' }}
                      >
                        {label}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: featured ? '#fff' : '#5cc6f0',
                        }}
                      >
                        {price}
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    alignSelf: 'flex-end',
                    maxWidth: '70%',
                    background: '#2b5278',
                    borderRadius: '14px 14px 4px 14px',
                    padding: '9px 13px',
                  }}
                >
                  <div style={{ fontSize: 13, color: '#fff' }}>Quero o VIP Anual ⭐</div>
                </div>
                <div
                  style={{
                    alignSelf: 'flex-start',
                    maxWidth: '90%',
                    background: '#182533',
                    borderRadius: '14px 14px 14px 4px',
                    padding: '12px 13px',
                    border: '1px solid #1f3a2e',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#6ee7b7',
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="#6ee7b7"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Pagamento confirmado via Pix
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: '#aebfcf', marginTop: 6 }}>
                    Acesso ao <strong style={{ color: '#e8eef4' }}>Canal VIP</strong> liberado
                    automaticamente. Bem-vinda! 🎉
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* copy */}
          <div style={{ flex: '1 1 360px', minWidth: 300, order: 1 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 12px',
                borderRadius: 999,
                background: 'rgba(34,158,217,.14)',
                border: '1px solid rgba(34,158,217,.4)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '.04em',
                color: '#5cc6f0',
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="#5cc6f0">
                <path d="M21.9 4.3l-3.1 14.6c-.2 1-.9 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-.9.5l.3-4.5L18 6.2c.4-.3-.1-.5-.6-.2L7.2 12.6l-4.4-1.4c-1-.3-1-.9.2-1.4l17.2-6.6c.8-.3 1.5.2 1.2 1.4z" />
              </svg>
              NOVO · TELEGRAM
            </div>
            <h2
              style={{
                margin: '16px 0 0',
                fontSize: 'clamp(26px,3.2vw,38px)',
                fontWeight: 800,
                letterSpacing: '-.02em',
              }}
            >
              Venda planos no Telegram{' '}
              <span
                style={{
                  background: 'linear-gradient(120deg,#34a9e8,#5cc6f0)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                sem sair da plataforma
              </span>
            </h2>
            <p style={{ margin: '16px 0 0', fontSize: 16, lineHeight: 1.65, color: '#a3b1c6' }}>
              Crie planos VIP, conecte seu bot e deixe o resto com a gente: o assinante paga, entra
              no canal e você recebe — tudo integrado, sem ferramenta de fora.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 26 }}>
              {[
                {
                  bg: 'rgba(34,158,217,.14)',
                  border: 'rgba(34,158,217,.3)',
                  icon: (
                    <svg
                      viewBox="0 0 24 24"
                      width="17"
                      height="17"
                      fill="none"
                      stroke="#5cc6f0"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="16" rx="3" />
                      <path d="M3 9h18M8 14h3" />
                    </svg>
                  ),
                  text: (
                    <>
                      <strong style={{ color: '#fff' }}>Planos recorrentes</strong> — mensal,
                      trimestral e anual, criados em minutos pelo painel.
                    </>
                  ),
                },
                {
                  bg: 'rgba(52,211,153,.12)',
                  border: 'rgba(52,211,153,.3)',
                  icon: (
                    <svg
                      viewBox="0 0 24 24"
                      width="17"
                      height="17"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="5" width="20" height="14" rx="3" />
                      <path d="M2 10h20" />
                    </svg>
                  ),
                  text: (
                    <>
                      <strong style={{ color: '#fff' }}>Recebimento integrado</strong> — Pix e
                      cartão direto na plataforma; o dinheiro cai pra você, sem intermediário.
                    </>
                  ),
                },
                {
                  bg: 'rgba(124,58,237,.14)',
                  border: 'rgba(124,58,237,.3)',
                  icon: (
                    <svg
                      viewBox="0 0 24 24"
                      width="17"
                      height="17"
                      fill="none"
                      stroke="#a78bfa"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 13l4 4L19 7M3 8a4 4 0 0 1 8 0" />
                    </svg>
                  ),
                  text: (
                    <>
                      <strong style={{ color: '#fff' }}>Acesso automático</strong> — assinou, entra
                      no canal; expirou, sai. Liberação e remoção no automático.
                    </>
                  ),
                },
                {
                  bg: `rgba(236,72,153,.14)`,
                  border: `rgba(236,72,153,.3)`,
                  icon: (
                    <svg
                      viewBox="0 0 24 24"
                      width="17"
                      height="17"
                      fill="none"
                      stroke={ACCENT}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20" />
                    </svg>
                  ),
                  text: (
                    <>
                      <strong style={{ color: '#fff' }}>Tudo num painel</strong> — assinantes,
                      receita e cliques da bio juntos, no seu domínio próprio.
                    </>
                  ),
                },
              ].map(({ bg, border, icon, text }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span
                    style={{
                      flexShrink: 0,
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: bg,
                      border: `1px solid ${border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {icon}
                  </span>
                  <span
                    style={{ fontSize: 14.5, lineHeight: 1.55, color: '#cbd5e1', paddingTop: 5 }}
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>
            <a
              href="#precos"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 9,
                marginTop: 28,
                padding: '13px 22px',
                borderRadius: 11,
                background: '#229ED9',
                color: '#fff',
                fontSize: 14.5,
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 14px 30px -10px rgba(34,158,217,.65)',
              }}
            >
              Ativar vendas no Telegram <IconArrow />
            </a>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="precos" style={{ maxWidth: 1180, margin: '0 auto', padding: '88px 24px 30px' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: ACCENT,
            }}
          >
            Preços
          </div>
          <h2
            style={{
              margin: '14px 0 0',
              fontSize: 'clamp(28px,3.6vw,40px)',
              fontWeight: 800,
              letterSpacing: '-.02em',
            }}
          >
            Comece grátis. Escale quando crescer.
          </h2>
          <p style={{ margin: '14px 0 0', fontSize: 16, color: '#a3b1c6' }}>
            Sem cartão para começar. Cancele quando quiser.
          </p>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
            gap: 18,
            marginTop: 48,
            alignItems: 'start',
          }}
        >
          {/* Starter */}
          <div
            style={{
              border: '1px solid #1e293b',
              borderRadius: 20,
              background: '#0b1220',
              padding: 30,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700 }}>Starter</div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-.02em' }}>R$0</span>
              <span style={{ fontSize: 14, color: '#64748b' }}>/mês</span>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 13.5, color: '#94a3b8' }}>
              Para começar e validar.
            </p>
            <Link
              href="/login"
              style={{
                display: 'block',
                textAlign: 'center',
                marginTop: 20,
                padding: 12,
                borderRadius: 10,
                background: 'rgba(255,255,255,.05)',
                border: '1px solid #1e293b',
                color: '#e2e8f0',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Criar conta
            </Link>
            <div style={{ height: 1, background: '#1e293b', margin: '22px 0' }} />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 11,
                fontSize: 13.5,
                color: '#cbd5e1',
              }}
            >
              {['1 criadora', 'Até 3 plataformas', 'Analytics de 7 dias'].map((f) => (
                <span key={f} style={{ display: 'flex', gap: 9 }}>
                  <IconCheck />
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Pro */}
          <div
            style={{
              position: 'relative',
              border: `1.5px solid ${ACCENT}`,
              borderRadius: 20,
              background: `linear-gradient(180deg,rgba(236,72,153,.08),#0b1220)`,
              padding: 30,
              boxShadow: `0 30px 70px -28px ${ACCENT}`,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: -12,
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '5px 13px',
                borderRadius: 999,
                background: ACCENT,
                color: '#fff',
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: '.04em',
                whiteSpace: 'nowrap',
              }}
            >
              MAIS POPULAR
            </span>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Pro</div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-.02em' }}>R$49</span>
              <span style={{ fontSize: 14, color: '#94a3b8' }}>/mês</span>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 13.5, color: '#cbd5e1' }}>
              Para criadoras em ritmo de crescimento.
            </p>
            <Link
              href="/login"
              style={{
                display: 'block',
                textAlign: 'center',
                marginTop: 20,
                padding: 12,
                borderRadius: 10,
                background: ACCENT,
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: `0 12px 26px -10px ${ACCENT}`,
              }}
            >
              Assinar Pro
            </Link>
            <div style={{ height: 1, background: '#1e293b', margin: '22px 0' }} />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 11,
                fontSize: 13.5,
                color: '#cbd5e1',
              }}
            >
              {[
                'Até 10 criadoras',
                'Todas as plataformas',
                'Analytics de 90 dias',
                'Vendas e planos no Telegram',
                'Domínio próprio',
              ].map((f) => (
                <span key={f} style={{ display: 'flex', gap: 9 }}>
                  <IconCheck color={ACCENT} />
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Agência */}
          <div
            style={{
              border: '1px solid #1e293b',
              borderRadius: 20,
              background: '#0b1220',
              padding: 30,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700 }}>Agência</div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-.02em' }}>R$199</span>
              <span style={{ fontSize: 14, color: '#64748b' }}>/mês</span>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 13.5, color: '#94a3b8' }}>
              Para quem gerencia muitos perfis.
            </p>
            <a
              href="mailto:contato@creatorslink.org"
              style={{
                display: 'block',
                textAlign: 'center',
                marginTop: 20,
                padding: 12,
                borderRadius: 10,
                background: 'rgba(255,255,255,.05)',
                border: '1px solid #1e293b',
                color: '#e2e8f0',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Falar com vendas
            </a>
            <div style={{ height: 1, background: '#1e293b', margin: '22px 0' }} />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 11,
                fontSize: 13.5,
                color: '#cbd5e1',
              }}
            >
              {[
                'Criadoras ilimitadas',
                'Acesso multiusuário',
                'Relatórios exportáveis',
                'Suporte prioritário',
              ].map((f) => (
                <span key={f} style={{ display: 'flex', gap: 9 }}>
                  <IconCheck />
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ maxWidth: 760, margin: '0 auto', padding: '88px 24px 30px' }}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: ACCENT,
            }}
          >
            Dúvidas
          </div>
          <h2
            style={{
              margin: '14px 0 0',
              fontSize: 'clamp(28px,3.6vw,40px)',
              fontWeight: 800,
              letterSpacing: '-.02em',
            }}
          >
            Perguntas frequentes
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 40 }}>
          {FAQS.map(({ q, a }) => (
            <FaqItem key={q} q={q} a={a} />
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '60px 24px 90px' }}>
        <div
          style={{
            position: 'relative',
            border: `1px solid rgba(236,72,153,.3)`,
            borderRadius: 26,
            background: 'linear-gradient(135deg,rgba(236,72,153,.14),rgba(124,58,237,.14))',
            padding: 'clamp(36px,6vw,64px)',
            textAlign: 'center',
            overflow: 'hidden',
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: -80,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 480,
              height: 340,
              background: `radial-gradient(circle,${ACCENT} 0%,transparent 62%)`,
              opacity: 0.3,
              filter: 'blur(50px)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative' }}>
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(28px,4vw,44px)',
                fontWeight: 900,
                letterSpacing: '-.02em',
              }}
            >
              Transforme sua bio num funil de verdade
            </h2>
            <p
              style={{
                margin: '16px auto 0',
                maxWidth: 480,
                fontSize: 16.5,
                lineHeight: 1.6,
                color: '#d4b8e8',
              }}
            >
              Crie sua primeira página em 60 segundos e veja os cliques chegarem.
            </p>
            <Link
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 9,
                marginTop: 28,
                padding: '15px 26px',
                borderRadius: 12,
                background: ACCENT,
                color: '#fff',
                fontSize: 15.5,
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: `0 16px 34px -12px ${ACCENT}`,
              }}
            >
              Começar grátis <IconArrow />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid #11203a', background: '#060d1c' }}>
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: '40px 24px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-wordmark-dark.svg" alt="Creators Link" height={24} style={{ height: 24, width: 'auto' }} />
          </div>
          <div style={{ display: 'flex', gap: 22, fontSize: 13.5, color: '#94a3b8' }}>
            {[
              ['#recursos', 'Recursos'],
              ['#precos', 'Preços'],
              ['#faq', 'Dúvidas'],
              ['#', 'Privacidade'],
            ].map(([href, label]) => (
              <a key={label} href={href} style={{ color: '#94a3b8', textDecoration: 'none' }}>
                {label}
              </a>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              fontSize: 12,
              color: '#52525b',
            }}
          >
            <span
              style={{
                border: '1px solid #3f3f46',
                borderRadius: 6,
                padding: '2px 7px',
                fontWeight: 600,
              }}
            >
              18+
            </span>
            <span>© 2026 CreatorsLink</span>
          </div>
        </div>
      </footer>

      {/* ── Animations ── */}
      <style>{`
        @keyframes lpspin { to { transform: rotate(360deg) } }
        @keyframes lpfloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important } }
      `}</style>
    </div>
  )
}

// ─── FAQ accordion (client would need 'use client' — using details/summary for zero-JS) ──
function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details
      style={{
        border: '1px solid #1e293b',
        borderRadius: 14,
        background: '#0b1220',
        overflow: 'hidden',
      }}
      className="group"
    >
      <summary
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '18px 20px',
          cursor: 'pointer',
          listStyle: 'none',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: 15.5, fontWeight: 600, color: '#f1f5f9' }}>{q}</span>
        <span
          style={{
            flexShrink: 0,
            width: 24,
            height: 24,
            borderRadius: 7,
            background: 'rgba(255,255,255,.05)',
            border: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 600,
            color: ACCENT,
          }}
        >
          +
        </span>
      </summary>
      <div style={{ padding: '0 20px 20px', fontSize: 14.5, lineHeight: 1.65, color: '#94a3b8' }}>
        {a}
      </div>
    </details>
  )
}
