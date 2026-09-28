'use client'
import { useState, use } from 'react'
import Image from 'next/image'
import PlayButton from './components/PlayButton'
import SpinWheelModal from './components/SpinWheel'
import ClaimForm from './components/ClaimForm'
import WalletView from './components/WalletView'
import Confetti from './components/Confetti'

type FlowStep = 'idle' | 'wheel' | 'claim' | 'wallet'

export default function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params)
  const slug = resolvedParams.slug || 'amplyfy'

  const [step, setStep] = useState<FlowStep>('idle')
  const [prize, setPrize] = useState<number | null>(null)
  const [couponId, setCouponId] = useState<string>('')
  const [guestName, setGuestName] = useState<string>('')
  const [confettiActive, setConfettiActive] = useState(false)

  // 1. User taps the main play button -> opens orange gradient wheel modal
  const handleOpenWheel = () => {
    setStep('wheel')
  }

  // 2. User presses the center SPIN button inside the wheel modal
  const handleSpinStart = async (): Promise<number> => {
    try {
      const res = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantSlug: slug,
          sessionToken: crypto.randomUUID()
        })
      })
      const data = await res.json()
      const won = data.prize || 15
      setPrize(won)
      return won
    } catch {
      const fallbackPrizes = [10, 15]
      const fallback = fallbackPrizes[Math.floor(Math.random() * fallbackPrizes.length)]
      setPrize(fallback)
      return fallback
    }
  }

  // 3. Wheel animation finishes spinning on the target slice
  const handleSpinComplete = (wonPrize: number) => {
    setPrize(wonPrize)
    setConfettiActive(true)

    // Smooth transition from wheel to claim form
    setTimeout(() => {
      setStep('claim')
    }, 1200)
  }

  // 4. User inputs Name & Phone with SMS Consent -> moves to Wallet
  const handleClaimed = (id: string, name: string) => {
    setCouponId(id)
    setGuestName(name)
    setStep('wallet')
  }

  const handleReset = () => {
    setStep('idle')
    setConfettiActive(false)
  }

  return (
    <main className="min-h-[100svh] flex flex-col justify-between items-center px-6 py-8 relative overflow-hidden bg-[#faf9f6] select-none">
      {/* Top Subtle Apple-style Brand Header */}
      <header className="w-full flex items-center justify-center gap-2 pt-2 pb-4 z-10">
        <Image
          src="/amplyfy-logo.jpg"
          alt="Amplyfy"
          width={32}
          height={32}
          className="rounded-full shadow-sm"
          priority
        />
        <span className="font-display font-black text-2xl tracking-tighter text-neutral-900">
          amplyfy<span className="text-[#ff5b16]">.</span>
        </span>
      </header>

      {/* Hero Content */}
      <section className="flex-1 flex flex-col items-center justify-center text-center max-w-sm my-auto z-10">
        <h1 className="font-display text-[58px] leading-[0.92] font-black text-neutral-900 tracking-tight mb-3">
          GOOD FOOD.<br />
          GREAT <span className="text-[#ff5b16]">LUCK.</span>
        </h1>
        
        <p className="text-neutral-500 text-sm font-medium tracking-wide mb-10 max-w-[280px]">
          Play for a chance to win a reward on your next order.
        </p>

        {/* 3D Play Button */}
        <PlayButton onPlay={handleOpenWheel} />
      </section>

      {/* Footer Note */}
      <footer className="w-full text-center py-2 z-10">
        <p className="text-[11px] text-neutral-400 font-medium tracking-wide">
          Tap the play button to reveal your spin wheel
        </p>
      </footer>

      {/* Confetti Animation */}
      <Confetti active={confettiActive} />

      {/* 1. Spin Wheel Modal (Orange Gradient + Center Button) */}
      <SpinWheelModal
        isOpen={step === 'wheel'}
        onClose={handleReset}
        onSpinStart={handleSpinStart}
        onSpinComplete={handleSpinComplete}
        restaurantName="Amplyfy"
      />

      {/* 2. Claim Prize Modal */}
      {prize !== null && (
        <ClaimForm
          isOpen={step === 'claim'}
          onClose={handleReset}
          prize={prize}
          onClaimed={handleClaimed}
          restaurantName="Amplyfy"
        />
      )}

      {/* 3. Add to Apple Wallet View */}
      {prize !== null && (
        <WalletView
          isOpen={step === 'wallet'}
          onClose={handleReset}
          guestName={guestName}
          couponId={couponId}
          prize={prize}
        />
      )}
    </main>
  )
}
