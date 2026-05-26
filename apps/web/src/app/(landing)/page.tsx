import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Zap,
  Shield,
  Cloud,
  Video,
  Image,
  Code2,
  Check,
  ChevronDown,
  ArrowRight,
  Cpu,
  Globe,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'NFSW AI Studio — Professional AI Adult Content Generator',
  description:
    'Generate ultra-HD adult images and cinematic videos with FLUX.1 and Wan 2.2 AI. Private cloud infrastructure. Instant GPU on demand. 18+ only.',
  alternates: { canonical: 'https://nfsw-ai-studio.com' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'NFSW AI Studio',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Web',
  description:
    'Professional AI-powered adult content generation platform. FLUX.1 images and Wan 2.2 video generation.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Starter',
      price: '49',
      priceCurrency: 'USD',
      billingIncrement: 'P1M',
    },
    {
      '@type': 'Offer',
      name: 'Creator',
      price: '149',
      priceCurrency: 'USD',
      billingIncrement: 'P1M',
    },
    {
      '@type': 'Offer',
      name: 'Studio',
      price: '499',
      priceCurrency: 'USD',
      billingIncrement: 'P1M',
    },
  ],
}

// ─── Feature data ─────────────────────────────────────────────────────────────
const features = [
  {
    icon: Image,
    title: 'Ultra-HD Image Generation',
    description:
      'Powered by FLUX.1-dev — the most capable open image model. Generate photorealistic images at any resolution with precise prompt control.',
  },
  {
    icon: Video,
    title: 'Cinematic Video Generation',
    description:
      'Wan 2.2 T2V & I2V models produce fluid, high-fidelity adult videos up to 720p. Text-to-video and image-to-video in seconds.',
  },
  {
    icon: Shield,
    title: 'Fully Private & Compliant',
    description:
      'Your content runs on your own Google Cloud or RunPod instance. No shared infrastructure. No data leaks. Your IP, your rules.',
  },
  {
    icon: Zap,
    title: 'Instant GPU On Demand',
    description:
      'Spin up an A100 80GB GPU in under 60 seconds. Pay only while generating. Auto-shutdown saves you money when idle.',
  },
  {
    icon: Cloud,
    title: 'Permanent Cloud Storage',
    description:
      'Every asset is automatically uploaded to Google Cloud Storage with metadata, signed download URLs, and a searchable library.',
  },
  {
    icon: Code2,
    title: 'API & Workflow Access',
    description:
      'Full ComfyUI API access. Import custom workflows. Build your own pipeline. White-label options available on Studio plan.',
  },
]

// ─── Steps data ───────────────────────────────────────────────────────────────
const steps = [
  {
    number: '01',
    title: 'Launch Your GPU',
    description:
      'One click starts a dedicated A100 GPU on Google Cloud or RunPod. Your private ComfyUI instance is ready in under 60 seconds.',
  },
  {
    number: '02',
    title: 'Generate with AI',
    description:
      'Type your prompt. Select FLUX.1 for images or Wan 2.2 for video. Watch real-time progress as your content is created.',
  },
  {
    number: '03',
    title: 'Download & Publish',
    description:
      'Assets are auto-saved to your private cloud library. Download via signed URL or integrate directly with your platform via API.',
  },
]

// ─── Pricing data ─────────────────────────────────────────────────────────────
const plans = [
  {
    name: 'Starter',
    price: '$49',
    period: '/month',
    description: 'Perfect for solo creators exploring AI generation.',
    highlighted: false,
    features: [
      '1,000 image generations/mo',
      '100 video generations/mo',
      '100 GB cloud storage',
      'Standard GPU queue',
      'FLUX.1 & Wan 2.2 models',
      'Email support',
    ],
    cta: 'Get Started',
    href: '/login',
  },
  {
    name: 'Creator',
    price: '$149',
    period: '/month',
    description: 'For professional creators who need speed and scale.',
    highlighted: true,
    features: [
      '5,000 image generations/mo',
      '500 video generations/mo',
      '500 GB cloud storage',
      'Priority GPU queue',
      'All AI models',
      'API access',
      '24/7 priority support',
    ],
    cta: 'Start Creating',
    href: '/login',
  },
  {
    name: 'Studio',
    price: '$499',
    period: '/month',
    description: 'For studios, platforms, and power users.',
    highlighted: false,
    features: [
      'Unlimited generations',
      'Unlimited storage',
      'Dedicated GPU instance',
      'Custom model fine-tuning',
      'White-label API',
      'ComfyUI workflow import',
      'SLA + dedicated support',
    ],
    cta: 'Contact Sales',
    href: '/login',
  },
]

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const faqs = [
  {
    question: 'What AI models are used?',
    answer:
      'NFSW AI Studio uses FLUX.1-dev for ultra-HD image generation, Wan 2.2 T2V-A14B for text-to-video, and Wan 2.2 I2V-A14B for image-to-video. All models run on A100 80GB GPUs for maximum quality.',
  },
  {
    question: 'Is my content private?',
    answer:
      'Yes. Your content runs on a GPU instance you control — either Google Cloud or RunPod. No content passes through our servers. All generated assets are stored in your private Google Cloud Storage bucket, accessible only to you.',
  },
  {
    question: 'How fast is generation?',
    answer:
      'Image generation with FLUX.1 takes 5–15 seconds depending on resolution and steps. Video generation with Wan 2.2 takes 30–120 seconds depending on length and resolution. GPU starts up in under 60 seconds.',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes, all plans are month-to-month with no lock-in. You can cancel, upgrade, or downgrade at any time from your settings. GPU costs are billed only while running.',
  },
  {
    question: 'Do you support custom workflows?',
    answer:
      'Creator and Studio plans include full ComfyUI API access, allowing you to import any custom workflow JSON. Studio users can also request custom model fine-tuning and white-label integration.',
  },
]

// ─── Stats ────────────────────────────────────────────────────────────────────
const stats = [
  { value: '12K+', label: 'Active Creators' },
  { value: '8M+', label: 'Assets Generated' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '<60s', label: 'GPU Start Time' },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-[#09090b] text-white" style={{ fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>

        {/* ── Skip to main content (accessibility) ── */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-violet-600 focus:text-white focus:rounded-md focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>

        {/* ════════════ HEADER / NAV ════════════ */}
        <header className="sticky top-0 z-40 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              {/* Logo */}
              <Link
                href="/"
                aria-label="NFSW AI Studio home"
                className="flex items-center gap-2 text-lg font-bold text-white"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                  aria-hidden="true"
                >
                  ✦
                </span>
                <span>NFSW AI Studio</span>
              </Link>

              {/* Nav links */}
              <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
                <Link href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Features
                </Link>
                <Link href="#how-it-works" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  How it works
                </Link>
                <Link href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Pricing
                </Link>
                <Link href="#faq" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  FAQ
                </Link>
              </nav>

              {/* CTA */}
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="hidden sm:inline-flex text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 focus-visible:outline-2 focus-visible:outline-violet-500"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                >
                  Start Free
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* ════════════ MAIN ════════════ */}
        <main id="main-content">

          {/* ─── HERO ─── */}
          <section
            aria-labelledby="hero-heading"
            className="relative overflow-hidden py-24 sm:py-32 lg:py-40"
          >
            {/* Background gradient orbs */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              <div
                className="absolute -top-40 left-1/2 h-150 w-150 -translate-x-1/2 rounded-full opacity-20 blur-3xl"
                style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)' }}
              />
              <div
                className="absolute top-1/2 -right-40 h-100 w-100 rounded-full opacity-15 blur-3xl"
                style={{ background: 'radial-gradient(circle, #4f46e5, transparent 70%)' }}
              />
              <div
                className="absolute bottom-0 left-20 h-75 w-75 rounded-full opacity-10 blur-3xl"
                style={{ background: 'radial-gradient(circle, #e879f9, transparent 70%)' }}
              />
            </div>

            <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
              {/* Age badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" aria-hidden="true" />
                <span>18+ Only · Adult Content Platform</span>
              </div>

              {/* Heading */}
              <h1
                id="hero-heading"
                className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight"
              >
                Generate{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #818cf8, #e879f9)' }}
                >
                  Stunning Adult
                </span>
                <br />
                Content with AI
              </h1>

              {/* Sub-heading */}
              <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                Ultra-HD images powered by <strong className="text-zinc-200">FLUX.1</strong> and cinematic videos with{' '}
                <strong className="text-zinc-200">Wan 2.2</strong>. Your private cloud. Instant GPU. Unlimited creativity.
              </p>

              {/* CTAs */}
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-bold text-white transition-all hover:opacity-90 hover:scale-105 focus-visible:outline-2 focus-visible:outline-violet-500 shadow-lg shadow-violet-900/40"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                >
                  Start Creating Free
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="#pricing"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-zinc-200 transition-all hover:bg-white/10 hover:border-white/20 focus-visible:outline-2 focus-visible:outline-white/30"
                >
                  View Pricing
                </Link>
              </div>

              {/* Trust text */}
              <p className="mt-6 text-xs text-zinc-500">
                No credit card required · Cancel anytime · GDPR compliant
              </p>
            </div>
          </section>

          {/* ─── STATS ─── */}
          <section aria-label="Platform statistics" className="border-y border-white/5 bg-white/2 py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <dl className="grid grid-cols-2 gap-8 lg:grid-cols-4">
                {stats.map(({ value, label }) => (
                  <div key={label} className="text-center">
                    <dt className="text-3xl font-extrabold text-white">{value}</dt>
                    <dd className="mt-1 text-sm text-zinc-400">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* ─── FEATURES ─── */}
          <section
            id="features"
            aria-labelledby="features-heading"
            className="py-24 sm:py-32"
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2
                  id="features-heading"
                  className="text-3xl sm:text-4xl font-bold text-white"
                >
                  Everything you need to create
                </h2>
                <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
                  Professional-grade tools built for adult content creators who demand quality, speed, and privacy.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {features.map(({ icon: Icon, title, description }) => (
                  <article
                    key={title}
                    className="group rounded-2xl border border-white/5 bg-white/3 p-6 transition-colors hover:border-violet-500/30 hover:bg-white/5"
                  >
                    <div
                      className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ background: 'linear-gradient(135deg, #7c3aed20, #4f46e520)' }}
                    >
                      <Icon className="h-5 w-5 text-violet-400" aria-hidden="true" />
                    </div>
                    <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ─── MODELS SHOWCASE ─── */}
          <section
            aria-labelledby="models-heading"
            className="py-16 border-y border-white/5 bg-white/2"
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h2 id="models-heading" className="text-center text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-10">
                Powered by the world&apos;s best open models
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { name: 'FLUX.1-dev', type: 'Image · 24B params', icon: Image },
                  { name: 'Wan 2.2 T2V', type: 'Video · Text→Video', icon: Video },
                  { name: 'Wan 2.2 I2V', type: 'Video · Image→Video', icon: Video },
                  { name: 'A100 SXM4', type: 'GPU · 80GB VRAM', icon: Cpu },
                ].map(({ name, type, icon: Icon }) => (
                  <div
                    key={name}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/3 px-4 py-3"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-violet-400" aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{name}</div>
                      <div className="text-xs text-zinc-500 truncate">{type}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── HOW IT WORKS ─── */}
          <section
            id="how-it-works"
            aria-labelledby="how-heading"
            className="py-24 sm:py-32"
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2
                  id="how-heading"
                  className="text-3xl sm:text-4xl font-bold text-white"
                >
                  Up and running in 60 seconds
                </h2>
                <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
                  No complex setup. No shared queues. No compromises.
                </p>
              </div>

              <ol className="relative grid grid-cols-1 gap-10 sm:grid-cols-3" aria-label="How it works steps">
                {/* Connector line (decorative) */}
                <li
                  aria-hidden="true"
                  className="pointer-events-none absolute top-8 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] hidden h-px sm:block"
                  style={{ background: 'linear-gradient(to right, transparent, #7c3aed40, #4f46e540, transparent)' }}
                />

                {steps.map(({ number, title, description }) => (
                  <li key={number} className="relative text-center">
                    <div
                      className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-black text-white shadow-lg shadow-violet-900/30"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                      aria-hidden="true"
                    >
                      {number}
                    </div>
                    <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed max-w-xs mx-auto">{description}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* ─── PRICING ─── */}
          <section
            id="pricing"
            aria-labelledby="pricing-heading"
            className="py-24 sm:py-32 border-t border-white/5"
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2
                  id="pricing-heading"
                  className="text-3xl sm:text-4xl font-bold text-white"
                >
                  Simple, transparent pricing
                </h2>
                <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
                  Pay for what you need. Scale as you grow. Cancel anytime.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 items-stretch">
                {plans.map((plan) => (
                  <article
                    key={plan.name}
                    className={`relative flex flex-col rounded-2xl p-8 transition-transform hover:-translate-y-1 ${
                      plan.highlighted
                        ? 'border-2 border-violet-500 bg-violet-950/30 shadow-2xl shadow-violet-900/30'
                        : 'border border-white/5 bg-white/3'
                    }`}
                    aria-label={`${plan.name} plan`}
                  >
                    {plan.highlighted && (
                      <div
                        className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                      >
                        Most Popular
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                      <p className="mt-1 text-sm text-zinc-400">{plan.description}</p>
                      <div className="mt-4 flex items-end gap-1">
                        <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                        <span className="mb-1 text-sm text-zinc-400">{plan.period}</span>
                      </div>
                    </div>

                    <ul className="mb-8 flex-1 space-y-3" aria-label={`${plan.name} plan features`}>
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5 text-sm text-zinc-300">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" aria-hidden="true" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={plan.href}
                      className={`mt-auto inline-flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-violet-500 ${
                        plan.highlighted
                          ? 'text-white hover:opacity-90 shadow-lg shadow-violet-900/40'
                          : 'border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:border-white/20'
                      }`}
                      style={
                        plan.highlighted
                          ? { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }
                          : undefined
                      }
                    >
                      {plan.cta}
                    </Link>
                  </article>
                ))}
              </div>

              <p className="mt-8 text-center text-xs text-zinc-500">
                All plans include: FLUX.1 + Wan 2.2 models · Private cloud · GCS storage · Auto-shutdown · Monthly billing
              </p>
            </div>
          </section>

          {/* ─── FAQ ─── */}
          <section
            id="faq"
            aria-labelledby="faq-heading"
            className="py-24 sm:py-32 border-t border-white/5 bg-white/2"
          >
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-14">
                <h2
                  id="faq-heading"
                  className="text-3xl sm:text-4xl font-bold text-white"
                >
                  Frequently asked questions
                </h2>
              </div>

              <dl className="space-y-2">
                {faqs.map(({ question, answer }) => (
                  <details
                    key={question}
                    className="group rounded-xl border border-white/5 bg-white/3 open:border-violet-500/30 transition-colors"
                  >
                    <summary
                      className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-sm font-medium text-white hover:text-violet-300 transition-colors [&::-webkit-details-marker]:hidden"
                    >
                      <dt>{question}</dt>
                      <ChevronDown
                        className="h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-300 group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <div className="px-6 pb-5">
                      <dd className="text-sm text-zinc-400 leading-relaxed">{answer}</dd>
                    </div>
                  </details>
                ))}
              </dl>
            </div>
          </section>

          {/* ─── FINAL CTA ─── */}
          <section
            aria-labelledby="cta-heading"
            className="py-24 sm:py-32"
          >
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
              <div
                className="relative overflow-hidden rounded-3xl px-8 py-16 sm:px-16"
                style={{ background: 'linear-gradient(135deg, #3b0764, #1e1b4b)' }}
              >
                {/* Decorative orb */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
                >
                  <div
                    className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-30 blur-3xl"
                    style={{ background: 'radial-gradient(circle, #e879f9, transparent)' }}
                  />
                  <div
                    className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full opacity-20 blur-3xl"
                    style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }}
                  />
                </div>

                <div className="relative">
                  <h2
                    id="cta-heading"
                    className="text-3xl sm:text-4xl font-extrabold text-white"
                  >
                    Ready to start creating?
                  </h2>
                  <p className="mt-4 text-lg text-violet-200">
                    Join thousands of creators generating professional content with AI.
                  </p>
                  <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-violet-900 transition-all hover:bg-violet-50 hover:scale-105 focus-visible:outline-2 focus-visible:outline-white shadow-lg"
                    >
                      Get Started Free
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <Link
                      href="#pricing"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
                    >
                      See Pricing
                    </Link>
                  </div>
                  <p className="mt-6 text-xs text-violet-300">
                    No credit card required · 18+ only · Cancel anytime
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* ════════════ FOOTER ════════════ */}
        <footer className="border-t border-white/5 bg-[#09090b]" aria-label="Site footer">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">

              {/* Brand */}
              <div className="col-span-2 sm:col-span-1">
                <Link
                  href="/"
                  aria-label="NFSW AI Studio home"
                  className="flex items-center gap-2 text-base font-bold text-white"
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-xs"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                    aria-hidden="true"
                  >
                    ✦
                  </span>
                  NFSW AI Studio
                </Link>
                <p className="mt-3 text-xs text-zinc-500 leading-relaxed max-w-xs">
                  Professional AI adult content generation. Private, fast, unlimited.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-600">
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>English</span>
                </div>
              </div>

              {/* Product links */}
              <nav aria-label="Product links">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">Product</h3>
                <ul className="space-y-3">
                  {[
                    { label: 'Features', href: '#features' },
                    { label: 'Pricing', href: '#pricing' },
                    { label: 'How it works', href: '#how-it-works' },
                    { label: 'API Docs', href: '/login' },
                  ].map(({ label, href }) => (
                    <li key={label}>
                      <Link href={href} className="text-sm text-zinc-400 hover:text-white transition-colors">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Legal links */}
              <nav aria-label="Legal links">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">Legal</h3>
                <ul className="space-y-3">
                  {[
                    { label: 'Terms of Service', href: '/login' },
                    { label: 'Privacy Policy', href: '/login' },
                    { label: 'Cookie Policy', href: '/login' },
                    { label: '2257 Compliance', href: '/login' },
                  ].map(({ label, href }) => (
                    <li key={label}>
                      <Link href={href} className="text-sm text-zinc-400 hover:text-white transition-colors">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Support links */}
              <nav aria-label="Support links">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">Support</h3>
                <ul className="space-y-3">
                  {[
                    { label: 'Documentation', href: '/login' },
                    { label: 'Contact', href: '/login' },
                    { label: 'Status', href: '/login' },
                    { label: 'Discord', href: '/login' },
                  ].map(({ label, href }) => (
                    <li key={label}>
                      <Link href={href} className="text-sm text-zinc-400 hover:text-white transition-colors">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            {/* Bottom bar */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-8">
              <p className="text-xs text-zinc-600">
                © {new Date().getFullYear()} NFSW AI Studio. All rights reserved.
              </p>
              <p className="text-xs text-zinc-600">
                🔞 Adult content platform · 18+ only · All models are AI-generated
              </p>
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}
