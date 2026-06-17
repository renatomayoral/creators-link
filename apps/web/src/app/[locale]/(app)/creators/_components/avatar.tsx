'use client'

type Props = { name: string; url: string | null; size: number }

export function Avatar({ name, url, size }: Props) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full border object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size >= 44 ? 15 : 14,
        background: 'linear-gradient(135deg,#6d5dfc,#22d3ee)',
      }}
    >
      {initials}
    </div>
  )
}
