'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SpinWheelModalProps {
  isOpen: boolean
  onClose: () => void
  onSpinStart: () => Promise<number> // returns prize
  onSpinComplete: (prize: number) => void
  restaurantName?: string
}

export default function SpinWheelModal({
  isOpen,
  onClose,
  onSpinStart,
  onSpinComplete,
  restaurantName = 'Amplyfy'
}: SpinWheelModalProps) {
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [currentPrize, setCurrentPrize] = useState<number | null>(null)

  const offers = [5, 10, 15, 5, 10, 15, 5, 10, 15, 5, 10, 15]
  const sliceAngle = 360 / offers.length

  const handleCenterClick = async () => {
    if (isSpinning) return
    setIsSpinning(true)

    // Call server/handler to pick prize securely
    const wonPrize = await onSpinStart()
    setCurrentPrize(wonPrize)

    // Determine target slice index
    const matchingIndices: number[] = []
    offers.forEach((val, idx) => {
      if (val === wonPrize) matchingIndices.push(idx)
    })
    const targetIndex = matchingIndices[Math.floor(Math.random() * matchingIndices.length)]

    // Calculate rotation: 6 full revolutions + slice alignment
    const targetDeg = 360 * 6 + (360 - (targetIndex * sliceAngle + sliceAngle / 2))
    setRotation(targetDeg)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Blurred backdrop with subtle dark dim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isSpinning ? onClose : undefined}
            className="fixed inset-0 bg-black/60 backdrop-blur-xl"
          />

          {/* Modal Container: Gorgeous Orange Apple-style Gradient */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-sm rounded-[38px] p-7 text-center shadow-2xl overflow-hidden z-10 border border-white/20"
            style={{
              background: 'radial-gradient(circle at 50% 10%, #ff8a3d 0%, #ff5b16 55%, #c83b00 100%)',
              boxShadow: '0 25px 60px -15px rgba(255, 91, 22, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
            }}
          >
            {/* Top Close Button */}
            {!isSpinning && (
              <button
                onClick={onClose}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-black/15 hover:bg-black/25 flex items-center justify-center text-white/90 transition-all backdrop-blur-sm active:scale-95"
                aria-label="Close"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Header info */}
            <div className="mb-6">
              <span className="inline-block text-[11px] font-bold tracking-[0.2em] text-white/80 uppercase">
                {restaurantName} REWARDS
              </span>
              <h2 className="font-display text-4xl text-white font-black leading-tight tracking-tight mt-1">
                SPIN TO WIN
              </h2>
              <p className="text-white/85 text-xs font-medium tracking-wide mt-1">
                Hit the center button to discover your treat.
              </p>
            </div>

            {/* Wheel Container */}
            <div className="relative mx-auto my-2 w-[270px] h-[270px] flex items-center justify-center">
              {/* Wheel Pointer Triangle at Top */}
              <div 
                className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)]"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '13px solid transparent',
                  borderRight: '13px solid transparent',
                  borderTop: '20px solid #ffffff'
                }}
              />

              {/* Glowing Outer Rim */}
              <div className="absolute inset-[-10px] rounded-full bg-white/10 backdrop-blur-sm border border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.25)] flex items-center justify-center">
                {/* 24 Bulbs */}
                {Array.from({ length: 24 }).map((_, i) => {
                  const angle = (i * 360) / 24
                  const rad = (angle * Math.PI) / 180
                  const r = 140
                  return (
                    <div
                      key={i}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: '#ffffff',
                        boxShadow: '0 0 6px 1px rgba(255, 255, 255, 0.9)',
                        top: `calc(50% - ${r * Math.cos(rad)}px)`,
                        left: `calc(50% + ${r * Math.sin(rad)}px)`,
                        transform: 'translate(-50%, -50%)',
                        animation: isSpinning ? `bulb-blink 0.35s infinite alternate ${i % 2 === 0 ? '0s' : '0.17s'}` : 'none'
                      }}
                    />
                  )
                })}
              </div>

              {/* The Spinning Rotor Wheel */}
              <motion.div
                className="w-full h-full rounded-full overflow-hidden shadow-2xl relative border-4 border-white/90"
                style={{
                  boxShadow: 'inset 0 0 15px rgba(0,0,0,0.2), 0 10px 25px rgba(0,0,0,0.3)'
                }}
                animate={{ rotate: rotation }}
                transition={{
                  duration: 6.2,
                  ease: [0.12, 0.72, 0.08, 1]
                }}
                onAnimationComplete={() => {
                  if (isSpinning && currentPrize !== null) {
                    setIsSpinning(false)
                    onSpinComplete(currentPrize)
                  }
                }}
              >
                <svg viewBox="0 0 400 400" className="w-full h-full">
                  {offers.map((offer, i) => {
                    const startAngle = i * 30 - 90
                    const endAngle = (i + 1) * 30 - 90
                    const radA = (startAngle * Math.PI) / 180
                    const radB = (endAngle * Math.PI) / 180
                    const x1 = 200 + 200 * Math.cos(radA)
                    const y1 = 200 + 200 * Math.sin(radA)
                    const x2 = 200 + 200 * Math.cos(radB)
                    const y2 = 200 + 200 * Math.sin(radB)

                    const colors = ['#fff8ec', '#ff7824', '#ff4d05']
                    const textFills = ['#b83300', '#ffffff', '#ffffff']
                    const fill = colors[i % 3]
                    const textFill = textFills[i % 3]

                    const midAngle = (startAngle + endAngle) / 2
                    const textRad = (midAngle * Math.PI) / 180
                    const tx = 200 + 130 * Math.cos(textRad)
                    const ty = 200 + 130 * Math.sin(textRad)

                    return (
                      <g key={i}>
                        <path
                          d={`M 200 200 L ${x1} ${y1} A 200 200 0 0 1 ${x2} ${y2} Z`}
                          fill={fill}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        <g transform={`translate(${tx} ${ty}) rotate(${midAngle + 90})`}>
                          <text
                            textAnchor="middle"
                            y="-2"
                            fill={textFill}
                            fontSize="28"
                            fontWeight="900"
                            fontFamily="var(--display)"
                          >
                            {offer}%
                          </text>
                          <text
                            textAnchor="middle"
                            y="14"
                            fill={textFill}
                            fontSize="10"
                            fontWeight="800"
                            letterSpacing="1.5"
                            fontFamily="var(--display)"
                          >
                            OFF
                          </text>
                        </g>
                      </g>
                    )
                  })}
                </svg>
              </motion.div>

              {/* Apple-Style Center Action Button */}
              <button
                onClick={handleCenterClick}
                disabled={isSpinning}
                className="absolute z-20 w-[84px] h-[84px] rounded-full flex flex-col items-center justify-center font-display text-white font-black shadow-2xl transition-transform active:scale-95 disabled:scale-100 disabled:cursor-not-allowed group border-2 border-white/80"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #ffe6d4 100%)',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.3), inset 0 2px 3px #ffffff'
                }}
              >
                <div 
                  className="w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center shadow-inner"
                  style={{
                    background: isSpinning 
                      ? 'linear-gradient(145deg, #e03b00, #ff5b16)' 
                      : 'linear-gradient(145deg, #ff631b, #d93800)'
                  }}
                >
                  <span className="text-[19px] leading-none tracking-wider drop-shadow-sm">
                    {isSpinning ? 'LUCK' : 'SPIN'}
                  </span>
                  <span className="text-[9px] font-sans font-bold tracking-widest text-white/90 mt-0.5 uppercase">
                    {isSpinning ? 'SPINNING' : 'TO WIN'}
                  </span>
                </div>
              </button>
            </div>

            {/* Bottom Status text */}
            <div className="mt-5 text-white/95 text-xs font-semibold tracking-wider">
              {isSpinning ? (
                <span className="animate-pulse">Finding your exclusive reward...</span>
              ) : (
                <span>Every spin wins • 5%, 10% or 15% OFF</span>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
