// Simplified Pix logo (Banco Central do Brasil) — official teal color,
// no external dependency since Pix isn't a crypto network (not in web3icons).
export function PixIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9.5 3.5a3 3 0 0 1 4.24 0l6.76 6.76a3 3 0 0 1 0 4.24l-6.76 6.76a3 3 0 0 1-4.24 0l-6.76-6.76a3 3 0 0 1 0-4.24z"
        fill="none"
      />
      <path
        d="M8.3 6.7a2.5 2.5 0 0 1 3.54 0l1.6 1.6a.9.9 0 0 0 1.27 0l1.59-1.6a2.5 2.5 0 0 1 1.77-.73h.53l-2.83-2.83a3 3 0 0 0-4.24 0L8.7 5.94z"
        fill="#32BCAD"
      />
      <path
        d="M18.63 8.6h-.53a2.5 2.5 0 0 0-1.77.74l-1.59 1.6a.9.9 0 0 1-1.27 0l-1.6-1.6a2.5 2.5 0 0 0-3.54 0l-1.66 1.67 1.66 1.66a2.5 2.5 0 0 0 3.54 0l1.6-1.6a.9.9 0 0 1 1.27 0l1.59 1.6a2.5 2.5 0 0 0 1.77.74h.53l2.66-2.67z"
        fill="#32BCAD"
      />
      <path
        d="M8.3 17.3l1.63-1.64a2.5 2.5 0 0 0 3.54 0l1.6-1.6a.9.9 0 0 1 1.27 0l1.59 1.6a2.5 2.5 0 0 0 1.77.74h.53l-2.83 2.83a3 3 0 0 1-4.24 0z"
        fill="#32BCAD"
      />
    </svg>
  )
}
