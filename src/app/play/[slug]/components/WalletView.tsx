'use client'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface WalletViewProps {
  isOpen: boolean
  onClose: () => void
  guestName: string
  couponId: string
  prize: number
}

export default function WalletView({
  isOpen,
  onClose,
  guestName,
  couponId,
  prize
}: WalletViewProps) {
  const passUrl = `/api/pass/${couponId}`

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-sm rounded-[36px] bg-white p-7 text-center shadow-2xl z-10 border border-black/5"
          >
            {/* Success Check Badge */}
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="font-display text-3xl font-black text-neutral-900 tracking-tight leading-tight">
              IT'S YOURS{guestName ? `, ${guestName.toUpperCase()}` : ''}!
            </h2>
            <p className="text-neutral-500 text-xs mt-1.5 mb-7 leading-relaxed">
              Add your <span className="font-bold text-neutral-800">{prize}% OFF</span> pass to Apple Wallet to redeem at your table.
            </p>

            {/* Official Apple-Approved "Add to Apple Wallet" Badge */}
            <div className="flex justify-center">
              <a
                href={passUrl}
                aria-label="Add to Apple Wallet"
                className="inline-block transition-transform active:scale-[0.97] hover:opacity-95 shadow-md shadow-black/20 rounded-[12px] overflow-hidden"
              >
                <Image
                  src="/add-to-apple-wallet.svg"
                  alt="Add to Apple Wallet"
                  width={210}
                  height={68}
                  className="w-[210px] h-auto block"
                  priority
                />
              </a>
            </div>

            <p className="text-[11px] text-neutral-400 mt-4 font-normal">
              Pass is saved directly to your iPhone Wallet app.
            </p>

            <button
              onClick={onClose}
              className="mt-6 text-xs font-bold text-neutral-400 hover:text-neutral-700 uppercase tracking-widest transition-colors py-2"
            >
              Back to Start
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
