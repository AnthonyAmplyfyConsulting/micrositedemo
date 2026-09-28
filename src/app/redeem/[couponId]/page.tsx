'use client'
import { useState, useEffect, use } from 'react'
import Image from 'next/image'

interface CouponData {
  prize_percent: number
  guest_name: string
  status: 'unused' | 'redeemed' | 'expired'
  expires_at: string
  redeemed_at: string | null
  restaurantName: string
}

export default function RedeemPage({ params }: { params: Promise<{ couponId: string }> }) {
  const resolvedParams = use(params)
  const couponId = resolvedParams.couponId

  const [loading, setLoading] = useState(true)
  const [coupon, setCoupon] = useState<CouponData | null>(null)
  const [pin, setPin] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [success, setSuccess] = useState(false)

  // Fetch actual live coupon status from Supabase backend
  useEffect(() => {
    async function fetchCoupon() {
      try {
        const res = await fetch(`/api/redeem?couponId=${couponId}`)
        if (res.ok) {
          const data = await res.json()
          setCoupon(data)
        } else {
          setErrorMsg('Coupon not found or invalid.')
        }
      } catch (err) {
        console.error(err)
        setErrorMsg('Network error. Unable to load coupon.')
      } finally {
        setLoading(false)
      }
    }
    if (couponId) {
      fetchCoupon()
    }
  }, [couponId])

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length < 4) return
    setErrorMsg('')
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponId,
          pin
        })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setSuccess(true)
        if (coupon) {
          setCoupon({ ...coupon, status: 'redeemed' })
        }
      } else {
        setErrorMsg(data.error || 'Incorrect PIN or unable to redeem.')
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('Failed to process redemption. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formattedExpiry = coupon?.expires_at
    ? new Date(coupon.expires_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : ''

  return (
    <main className="min-h-[100svh] bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-neutral-900 select-none">
      {/* Top Header */}
      <div className="flex items-center gap-2 mb-8">
        <Image
          src="/amplyfy-logo.jpg"
          alt="Amplyfy"
          width={36}
          height={36}
          className="rounded-full shadow-sm"
        />
        <span className="font-display font-black text-2xl tracking-tighter text-neutral-900">
          amplyfy<span className="text-[#ff5b16]">.</span>
        </span>
      </div>

      <div className="w-full max-w-sm bg-white rounded-[36px] shadow-2xl overflow-hidden border border-black/5">
        {/* Top Header Card */}
        <div
          className="px-6 py-8 text-center text-white relative overflow-hidden"
          style={{
            background:
              coupon?.status === 'redeemed'
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #ff7a29 0%, #ff5b16 60%, #e24502 100%)'
          }}
        >
          <span className="inline-block text-[11px] font-bold tracking-[0.2em] text-white/85 uppercase mb-1">
            STAFF REDEMPTION
          </span>

          {loading ? (
            <div className="py-6 text-white/80 font-medium text-sm animate-pulse">
              Verifying coupon...
            </div>
          ) : coupon ? (
            <>
              <div className="font-display text-[72px] font-black leading-none my-1 tracking-tight">
                {coupon.prize_percent}
                <span className="text-3xl ml-1 font-bold opacity-90">% OFF</span>
              </div>
              <p className="text-xs font-semibold text-white/90 tracking-wider uppercase mt-1">
                Guest: {coupon.guest_name}
              </p>
              <p className="text-[11px] text-white/75 mt-0.5">
                Valid until {formattedExpiry}
              </p>
            </>
          ) : (
            <div className="py-4 text-white font-semibold text-sm">
              Invalid Coupon
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-7">
          {loading && (
            <div className="text-center py-6 text-neutral-400 text-sm">
              Loading pass details...
            </div>
          )}

          {!loading && coupon?.status === 'unused' && !success && (
            <form onSubmit={handleRedeem} className="flex flex-col items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                Enter Staff PIN
              </label>

              {errorMsg && (
                <div className="w-full mb-4 text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-xl text-center border border-red-100">
                  {errorMsg}
                </div>
              )}

              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={pin}
                onChange={e => setPin(e.target.value)}
                className="text-center text-4xl tracking-[0.4em] font-mono bg-neutral-50 border border-neutral-200 rounded-2xl w-full py-3 mb-5 focus:ring-2 focus:ring-[#ff5b16] focus:bg-white focus:outline-none transition-all placeholder:text-neutral-300"
                placeholder="••••"
                autoFocus
              />

              <button
                type="submit"
                disabled={isSubmitting || pin.length < 4}
                className="w-full h-14 rounded-2xl text-white font-bold text-base tracking-wide transition-all duration-200 active:scale-[0.98] disabled:opacity-50 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #ff7020, #ff5b16)',
                  boxShadow: '0 8px 20px -4px rgba(255, 91, 22, 0.45)'
                }}
              >
                {isSubmitting ? 'VERIFYING...' : 'REDEEM COUPON'}
              </button>

              <p className="text-[11px] text-neutral-400 text-center mt-4">
                Redeeming marks this pass as used in real-time. Apply discount manually in POS.
              </p>
            </form>
          )}

          {(!loading && (coupon?.status === 'redeemed' || success)) && (
            <div className="text-center py-2">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-display text-2xl font-black text-neutral-900 tracking-tight mb-1">
                COUPON REDEEMED!
              </h2>
              <p className="text-neutral-500 text-xs mb-4">
                Discount has been approved. You can now apply the discount in your POS system.
              </p>
              <div className="inline-block bg-neutral-100 text-neutral-600 text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                Status: Used
              </div>
            </div>
          )}

          {!loading && coupon?.status === 'expired' && (
            <div className="text-center py-2">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="font-display text-2xl font-black text-neutral-900 tracking-tight mb-1">
                COUPON EXPIRED
              </h2>
              <p className="text-neutral-500 text-xs">
                This promotional offer has passed its expiration date and cannot be redeemed.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
