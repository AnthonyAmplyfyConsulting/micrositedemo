'use client'
import { useState, useEffect } from 'react'

export default function RedeemPage({ params }: { params: { couponId: string } }) {
  const [status, setStatus] = useState<'loading' | 'unused' | 'redeemed' | 'expired'>('loading')
  const [pin, setPin] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const mockData = {
    restaurant: 'Amplyfy Burger',
    prize: 15,
    guestName: 'Alex',
    expiry: 'Dec 31, 2024'
  }

  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      setStatus('unused')
    }, 800)
  }, [params.couponId])

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length < 4) return
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setSuccess(true)
      setStatus('redeemed')
    }, 1000)
  }

  return (
    <main className="min-h-[100svh] bg-[#faf9f6] flex flex-col items-center p-6 text-brand-dark">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 mt-10">
        
        <div className="text-center mb-8 border-b border-brand-line pb-8">
          <h1 className="font-display text-2xl tracking-widest text-brand-orange mb-2">{mockData.restaurant}</h1>
          <div className="font-display text-6xl leading-none">{mockData.prize}% OFF</div>
          <p className="text-brand-muted mt-2">Issued to {mockData.guestName}</p>
          <p className="text-sm text-brand-muted mt-1">Valid until {mockData.expiry}</p>
        </div>

        {status === 'loading' && (
          <div className="text-center text-brand-muted py-8">Loading pass details...</div>
        )}

        {status === 'unused' && !success && (
          <form onSubmit={handleRedeem} className="flex flex-col items-center">
            <label className="text-sm font-bold mb-4 uppercase tracking-wider text-brand-muted">Staff PIN</label>
            <input 
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="text-center text-4xl tracking-[0.5em] font-mono border-2 border-brand-line rounded-xl w-full py-4 mb-6 focus:border-brand-orange focus:outline-none"
              placeholder="••••"
            />
            <button 
              type="submit"
              disabled={isSubmitting || pin.length < 4}
              className="w-full bg-brand-orange text-white font-display text-2xl py-5 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'VERIFYING...' : 'REDEEM COUPON'}
            </button>
          </form>
        )}

        {status === 'redeemed' && (
          <div className="text-center py-4">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-bold text-xl mb-2 text-green-600">Successfully Redeemed!</h2>
            <p className="text-brand-muted">This coupon has been marked as used.</p>
          </div>
        )}

        {status === 'expired' && (
          <div className="text-center py-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="font-bold text-xl mb-2 text-red-600">Coupon Expired</h2>
            <p className="text-brand-muted">This offer is no longer valid.</p>
          </div>
        )}

      </div>
    </main>
  )
}
