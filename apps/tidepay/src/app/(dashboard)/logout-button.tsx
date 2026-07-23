'use client'

import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function LogoutButton() {
  const router = useRouter()
  return (
    <button
      onClick={async () => {
        await authClient.signOut()
        router.push('/login')
      }}
      className="text-neutral-400 hover:text-white"
    >
      Sign out
    </button>
  )
}
