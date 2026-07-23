'use client'

import { forwardRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(72),
})

const registerSchema = z
  .object({
    name: z.string().min(1).max(80),
    email: z.email(),
    password: z.string().min(8).max(72),
    confirm: z.string().min(1),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

type LoginData = z.infer<typeof loginSchema>
type RegisterData = z.infer<typeof registerSchema>

export function AuthForm() {
  const router = useRouter()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [serverError, setServerError] = useState('')

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterData>({ resolver: zodResolver(registerSchema) })

  async function handleLogin(data: LoginData) {
    setServerError('')
    const res = await authClient.signIn.email(data)
    if (res.error) {
      setServerError('Invalid email or password.')
      return
    }
    router.push('/dashboard')
  }

  async function handleRegister(data: RegisterData) {
    setServerError('')
    const res = await authClient.signUp.email({ name: data.name, email: data.email, password: data.password })
    if (res.error) {
      setServerError(res.error.code === 'USER_ALREADY_EXISTS' ? 'An account with this email already exists.' : 'Something went wrong. Please try again.')
      return
    }
    router.push('/dashboard')
  }

  const loginSubmitting = loginForm.formState.isSubmitting
  const registerSubmitting = registerForm.formState.isSubmitting

  return (
    <div className="w-full max-w-sm">
      <div className="mb-5 flex rounded-lg border border-neutral-800 bg-neutral-900 p-0.5">
        {(['login', 'register'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t)
              setServerError('')
            }}
            className={`flex-1 rounded-md py-1.5 text-sm font-semibold transition-all ${
              tab === t ? 'bg-neutral-800 text-white shadow' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {t === 'login' ? 'Sign in' : 'Register'}
          </button>
        ))}
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{serverError}</div>
      )}

      {tab === 'login' && (
        <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4" noValidate>
          <Field id="email" label="Email" type="email" error={loginForm.formState.errors.email?.message} {...loginForm.register('email')} />
          <Field
            id="password"
            label="Password"
            type="password"
            error={loginForm.formState.errors.password?.message}
            {...loginForm.register('password')}
          />
          <button
            type="submit"
            disabled={loginSubmitting}
            className="w-full rounded-md bg-white px-4 py-2 font-medium text-black disabled:opacity-50"
          >
            {loginSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}

      {tab === 'register' && (
        <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4" noValidate>
          <Field id="name" label="Name" type="text" error={registerForm.formState.errors.name?.message} {...registerForm.register('name')} />
          <Field
            id="reg-email"
            label="Email"
            type="email"
            error={registerForm.formState.errors.email?.message}
            {...registerForm.register('email')}
          />
          <Field
            id="reg-password"
            label="Password"
            type="password"
            error={registerForm.formState.errors.password?.message}
            {...registerForm.register('password')}
          />
          <Field
            id="reg-confirm"
            label="Confirm password"
            type="password"
            error={registerForm.formState.errors.confirm?.message}
            {...registerForm.register('confirm')}
          />
          <button
            type="submit"
            disabled={registerSubmitting}
            className="w-full rounded-md bg-white px-4 py-2 font-medium text-black disabled:opacity-50"
          >
            {registerSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}
    </div>
  )
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  id: string
  label: string
  error?: string
}

const Field = forwardRef<HTMLInputElement, FieldProps>(({ id, label, error, ...rest }, ref) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="text-sm text-neutral-300">
      {label}
    </label>
    <input
      id={id}
      ref={ref}
      aria-invalid={!!error}
      className={`w-full rounded-md border bg-neutral-900 px-3 py-2 text-white placeholder:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
        error ? 'border-red-500/60' : 'border-neutral-800'
      }`}
      {...rest}
    />
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
))
Field.displayName = 'Field'
