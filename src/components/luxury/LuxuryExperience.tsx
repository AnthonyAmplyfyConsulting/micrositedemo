'use client'
import { useEffect, useRef } from 'react'
import './luxury.css'

export default function LuxuryExperience() {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let stopped = false
    let dispose: (() => void) | undefined
    import('./luxury-engine').then(({ mountLuxury }) => {
      if (!stopped && host.current) dispose = mountLuxury(host.current)
    })
    return () => { stopped = true; dispose?.() }
  }, [])
  return <div ref={host} className="amp-luxury-root"><div className="amp-boot">Setting the table…</div></div>
}
