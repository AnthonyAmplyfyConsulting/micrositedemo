'use client'
import { motion, AnimatePresence } from 'framer-motion'

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
  const handleAppleWallet = () => {
    // Initiate direct download of the generated .pkpass
    window.location.href = `/api/pass/${couponId}`
  }

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

            {/* Official Apple Wallet Badge Style Button */}
            <div className="space-y-3">
              <button
                onClick={handleAppleWallet}
                className="w-full h-14 bg-black hover:bg-neutral-900 active:scale-[0.98] text-white rounded-2xl flex items-center justify-center gap-3 px-5 transition-all shadow-lg shadow-black/10 border border-neutral-800"
              >
                {/* Official Apple Logo SVG */}
                <svg className="w-6 h-6 fill-current" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.77-11.64-14.19-5.99-9.45-10.82-20.19-14.49-32.22-3.67-12.02-5.51-23.47-5.51-34.34 0-14.12 3.5-25.76 10.51-34.91 7.01-9.15 15.93-13.89 26.77-14.22 4.9.11 10.37 1.34 16.42 3.69 6.04 2.34 9.87 3.56 11.47 3.65 1.5.09 5.37-1.19 11.61-3.83 6.24-2.65 11.75-3.83 16.53-3.56 12.63.78 22.38 5.62 29.25 14.52-11.09 6.74-16.53 16.19-16.32 28.36.21 9.56 3.83 17.61 10.85 24.13 7.02 6.53 15.34 10.43 24.96 11.72-2.34 6.74-5.32 13.8-8.94 21.18zM119.22 31.84c0-7.39 2.65-14.54 7.96-21.46 5.31-6.91 12.04-11.08 20.18-12.51.53 2.13.8 4.26.8 6.38 0 7.34-2.77 14.7-8.3 22.08-5.54 7.39-12.42 11.6-20.64 12.64v-7.13z" />
                </svg>
                <div className="text-left leading-none">
                  <span className="block text-[10px] text-white/70 uppercase font-semibold tracking-wider">
                    Add to
                  </span>
                  <span className="text-[17px] font-semibold tracking-tight">
                    Apple Wallet
                  </span>
                </div>
              </button>
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
