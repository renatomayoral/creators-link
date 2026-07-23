import { CheckoutClient } from './checkout-client'

// Minimal subscriber-facing checkout: connect wallet, review the plan, and
// grant the ERC-20 allowance the operator needs to run recurring pulls.
export default async function SubscribePage({ params }: { params: Promise<{ subscriptionId: string }> }) {
  const { subscriptionId } = await params
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <CheckoutClient subscriptionId={subscriptionId} />
    </main>
  )
}
