import { AuthForm } from './auth-form'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-xl font-semibold">Splitfy merchant dashboard</h1>
      <AuthForm />
    </main>
  )
}
