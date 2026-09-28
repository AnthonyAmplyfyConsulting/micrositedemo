'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ClaimFormProps {
  isOpen: boolean
  onClose: () => void
  prize: number
  onClaimed: (couponId: string, name: string) => void
  restaurantName?: string
}

export default function ClaimForm({
  isOpen,
  onClose,
  prize,
  onClaimed,
  restaurantName = 'Amplyfy'
}: ClaimFormProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [smsConsent, setSmsConsent] = useState(true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const cleanName = name.trim()
    if (!cleanName) {
      setError('Please enter your name.')
      return
    }

    let cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
      cleanPhone = cleanPhone.substring(1)
    }
    const phoneRegex = /^[2-9]\d{2}[2-9]\d{6}$/
    if (!phoneRegex.test(cleanPhone)) {
      setError('Please enter a valid 10-digit US phone number.')
      return
    }

    setIsSubmitting(true)

    try {
      // Create session and claim
      const spinRes = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantSlug: 'amplyfy',
          sessionToken: crypto.randomUUID()
        })
      })
      const spinData = await spinRes.json()

      const claimRes = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spinId: spinData.spinId,
          name: cleanName,
          phone: cleanPhone,
          smsConsent
        })
      })
      const claimData = await claimRes.json()

      if (claimData.couponId) {
        onClaimed(claimData.couponId, cleanName)
      } else {
        setError(claimData.error || 'Something went wrong. Please try again.')
      }
    } catch (err) {
      console.error(err)
      setError('Connection failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isSubmitting ? onClose : undefined}
            className="fixed inset-0 bg-black/60 backdrop-blur-xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-sm rounded-[36px] bg-white shadow-2xl overflow-hidden z-10 border border-black/5"
          >
            {/* Close Button */}
            {!isSubmitting && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 text-white flex items-center justify-center transition-all active:scale-95"
                aria-label="Close"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Apple Card Header - High Polish Vibrant Orange */}
            <div 
              className="px-6 pt-9 pb-7 text-center text-white relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #ff7a29 0%, #ff5b16 60%, #e24502 100%)',
              }}
            >
              {/* Subtle glass reflection */}
              <div className="absolute -top-12 -left-12 w-44 h-44 rounded-full bg-white/10 blur-xl pointer-events-none" />

              <span className="inline-block text-[11px] font-bold tracking-[0.2em] text-white/85 uppercase mb-1">
                THAT'S A TASTY WIN!
              </span>

              <div className="flex items-center justify-center font-display text-[76px] font-black leading-none my-1 tracking-tight">
                {prize}<span className="text-3xl ml-1 tracking-normal font-bold opacity-90">% OFF</span>
              </div>

              <span className="text-[12px] font-bold tracking-[0.16em] text-white/90 uppercase">
                YOUR NEXT ORDER
              </span>
            </div>

            {/* Form Section - Clean Apple Minimalist */}
            <form onSubmit={handleSubmit} className="p-6 pt-5">
              <div className="text-center mb-5">
                <h3 className="font-display text-2xl font-black text-neutral-900 tracking-tight">
                  CLAIM YOUR PRIZE
                </h3>
                <p className="text-neutral-500 text-xs mt-0.5 font-medium">
                  Enter your details to receive your digital pass.
                </p>
              </div>

              {error && (
                <div className="mb-4 text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-xl text-center border border-red-100">
                  {error}
                </div>
              )}

              <div className="space-y-3.5">
                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-1 ml-0.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="First Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#ff5b16] focus:bg-white transition-all placeholder:text-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-1 ml-0.5">
                    Phone Number
                  </label>
                  <div className="flex rounded-xl bg-neutral-50 border border-neutral-200 overflow-hidden focus-within:ring-2 focus-within:ring-[#ff5b16] focus-within:bg-white transition-all">
                    <span className="flex items-center px-3.5 text-xs font-bold text-neutral-500 border-r border-neutral-200 bg-neutral-100/60 select-none">
                      US +1
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="(555) 123-4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="flex-1 h-12 px-3.5 bg-transparent text-neutral-900 text-[15px] focus:outline-none placeholder:text-neutral-400"
                    />
                  </div>
                </div>

                {/* SMS Consent Checkbox */}
                <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={smsConsent}
                    onChange={(e) => setSmsConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-neutral-300 accent-[#ff5b16] text-[#ff5b16] focus:ring-0"
                  />
                  <span className="text-[11px] leading-relaxed text-neutral-500 font-normal">
                    I agree to receive promotional text messages from {restaurantName}. Consent is optional. Msg & data rates may apply.
                  </span>
                </label>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full h-12 rounded-xl text-white font-bold text-[14px] tracking-wide transition-all duration-200 active:scale-[0.98] disabled:opacity-60 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #ff7020, #ff5b16)',
                  boxShadow: '0 8px 20px -4px rgba(255, 91, 22, 0.45)'
                }}
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Generating Pass...
                  </span>
                ) : (
                  'CONTINUE TO WALLET →'
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
