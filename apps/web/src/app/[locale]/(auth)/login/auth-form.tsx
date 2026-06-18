'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocale } from 'next-intl'
import { authClient } from '@repo/auth/client'
import { Input } from '@repo/ui/components/input'
import { Label } from '@repo/ui/components/label'
import { Button } from '@repo/ui/components/button'

type Props = {
  googleLabel: string
  orDivider: string
  emailLabel: string
  emailPlaceholder: string
  passwordLabel: string
  passwordPlaceholder: string
  signInButton: string
  signingIn: string
  nameLabel: string
  namePlaceholder: string
  confirmPasswordLabel: string
  confirmPasswordPlaceholder: string
  registerButton: string
  registering: string
  errorInvalidCredentials: string
  errorEmailInUse: string
  errorGeneric: string
  age18: string
  termsLink: string
  and: string
  privacyLink: string
  validEmailRequired: string
  validPasswordMin: string
  validPasswordMax: string
  validNameMin: string
  validNameMax: string
  validConfirmRequired: string
  errorPasswordMismatch: string
}

export function AuthForm(p: Props) {
  const locale = useLocale()
  const callbackURL = `/${locale}/dashboard`
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  // ── Schemas (built with translated messages) ──────────────────────────────
  const loginSchema = z.object({
    email: z.string().email(p.validEmailRequired),
    password: z.string().min(8, p.validPasswordMin).max(72, p.validPasswordMax),
  })

  const registerSchema = z
    .object({
      name: z.string().min(1, p.validNameMin).max(80, p.validNameMax),
      email: z.string().email(p.validEmailRequired),
      password: z.string().min(8, p.validPasswordMin).max(72, p.validPasswordMax),
      confirm: z.string().min(1, p.validConfirmRequired),
    })
    .refine((d) => d.password === d.confirm, {
      message: p.errorPasswordMismatch,
      path: ['confirm'],
    })

  type LoginData = z.infer<typeof loginSchema>
  type RegisterData = z.infer<typeof registerSchema>

  // ── Forms ─────────────────────────────────────────────────────────────────
  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterData>({ resolver: zodResolver(registerSchema) })

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleGoogle() {
    setGoogleLoading(true)
    await authClient.signIn.social({ provider: 'google', callbackURL })
  }

  async function handleLogin(data: LoginData) {
    setServerError('')
    const res = await authClient.signIn.email({ ...data, callbackURL })
    if (res.error) setServerError(p.errorInvalidCredentials)
  }

  async function handleRegister(data: RegisterData) {
    setServerError('')
    const res = await authClient.signUp.email({
      name: data.name,
      email: data.email,
      password: data.password,
      callbackURL,
    })
    if (res.error) {
      setServerError(
        res.error.code === 'USER_ALREADY_EXISTS' ? p.errorEmailInUse : p.errorGeneric,
      )
    }
  }

  const loginSubmitting = loginForm.formState.isSubmitting
  const registerSubmitting = registerForm.formState.isSubmitting

  return (
    <div>
      {/* Google */}
      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {googleLoading ? (
          <Spinner />
        ) : (
          <GoogleIcon />
        )}
        {p.googleLabel}
      </button>

      {/* Divider */}
      <div className="relative my-5 flex items-center">
        <div className="flex-1 border-t border-white/10" />
        <span className="mx-3 text-xs text-zinc-500">{p.orDivider}</span>
        <div className="flex-1 border-t border-white/10" />
      </div>

      {/* Tabs */}
      <div className="mb-5 flex rounded-lg border border-white/10 bg-white/5 p-0.5">
        {(['login', 'register'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setServerError('') }}
            className={`flex-1 rounded-md py-1.5 text-sm font-semibold transition-all ${
              tab === t
                ? 'bg-white/10 text-white shadow'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t === 'login' ? p.signInButton : p.registerButton}
          </button>
        ))}
      </div>

      {/* Server error */}
      {serverError && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {serverError}
        </div>
      )}

      {/* Login form */}
      {tab === 'login' && (
        <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4" noValidate>
          <Field
            id="email"
            label={p.emailLabel}
            placeholder={p.emailPlaceholder}
            type="email"
            error={loginForm.formState.errors.email?.message}
            {...loginForm.register('email')}
          />
          <Field
            id="password"
            label={p.passwordLabel}
            placeholder={p.passwordPlaceholder}
            type="password"
            error={loginForm.formState.errors.password?.message}
            {...loginForm.register('password')}
          />
          <Button
            type="submit"
            disabled={loginSubmitting}
            className="w-full bg-pink-600 font-semibold text-white hover:bg-pink-500 disabled:opacity-50"
          >
            {loginSubmitting ? <><Spinner />{p.signingIn}</> : p.signInButton}
          </Button>
        </form>
      )}

      {/* Register form */}
      {tab === 'register' && (
        <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4" noValidate>
          <Field
            id="name"
            label={p.nameLabel}
            placeholder={p.namePlaceholder}
            type="text"
            error={registerForm.formState.errors.name?.message}
            {...registerForm.register('name')}
          />
          <Field
            id="reg-email"
            label={p.emailLabel}
            placeholder={p.emailPlaceholder}
            type="email"
            error={registerForm.formState.errors.email?.message}
            {...registerForm.register('email')}
          />
          <Field
            id="reg-password"
            label={p.passwordLabel}
            placeholder={p.passwordPlaceholder}
            type="password"
            error={registerForm.formState.errors.password?.message}
            {...registerForm.register('password')}
          />
          <Field
            id="reg-confirm"
            label={p.confirmPasswordLabel}
            placeholder={p.confirmPasswordPlaceholder}
            type="password"
            error={registerForm.formState.errors.confirm?.message}
            {...registerForm.register('confirm')}
          />
          <Button
            type="submit"
            disabled={registerSubmitting}
            className="w-full bg-pink-600 font-semibold text-white hover:bg-pink-500 disabled:opacity-50"
          >
            {registerSubmitting ? <><Spinner />{p.registering}</> : p.registerButton}
          </Button>
        </form>
      )}

      {/* Terms */}
      <p className="mt-5 text-center text-xs text-zinc-500">
        {p.age18}{' '}
        <a href="#" className="underline transition-colors hover:text-zinc-300">{p.termsLink}</a>
        {' '}{p.and}{' '}
        <a href="#" className="underline transition-colors hover:text-zinc-300">{p.privacyLink}</a>.
      </p>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

import { forwardRef } from 'react'

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  id: string
  label: string
  error?: string
}

const Field = forwardRef<HTMLInputElement, FieldProps>(({ id, label, error, ...rest }, ref) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-zinc-300">{label}</Label>
    <Input
      id={id}
      ref={ref}
      aria-invalid={!!error}
      className={`border-white/10 bg-white/5 text-white placeholder:text-zinc-600 focus-visible:ring-pink-500/50 ${
        error ? 'border-red-500/60' : ''
      }`}
      {...rest}
    />
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
))
Field.displayName = 'Field'

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
