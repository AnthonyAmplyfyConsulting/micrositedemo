'use client'
import { useEffect, useState } from 'react'

interface ConfettiProps {
  active: boolean
}

export default function Confetti({ active }: ConfettiProps) {
  const [pieces, setPieces] = useState<{ id: number; left: number; delay: number; color: string }[]>([])
  const colors = ['#ff5b16', '#ffb328', '#fff1cf', '#191919']

  useEffect(() => {
    if (active) {
      const newPieces = Array.from({ length: 65 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)]
      }))
      setPieces(newPieces)

      const timer = setTimeout(() => {
        setPieces([])
      }, 3500)

      return () => clearTimeout(timer)
    } else {
      setPieces([])
    }
  }, [active])

  if (!active || pieces.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece w-3 h-6 rounded-sm"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            backgroundColor: p.color
          }}
        />
      ))}
    </div>
  )
}
