import type { Metadata } from 'next'
import Link from 'next/link'
import { GoogleSignInButton } from './google-button'

export const metadata: Metadata = {
  title: 'Sign In — NFSW AI Studio',
  description: 'Sign in to your NFSW AI Studio account.',
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <Link href="/" className="inline-block text-2xl font-bold text-white">
          🎬 AI Studio
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-white">Welcome back</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Sign in to access your AI generation studio
        </p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <GoogleSignInButton />

        <div className="mt-6 text-center">
          <p className="text-xs text-zinc-500">
            By signing in, you agree to our{' '}
            <Link href="#" className="text-zinc-400 underline hover:text-white transition-colors">
              Terms of Service
            </Link>{' '}
            and confirm you are 18+.
          </p>
        </div>
      </div>

      {/* Back to home */}
      <div className="mt-6 text-center">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-400 transition-colors">
          ← Back to home
        </Link>
      </div>
    </div>
  )
}
