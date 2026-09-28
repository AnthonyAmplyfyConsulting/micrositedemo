import type { Metadata } from 'next'
import { Barlow_Condensed, DM_Sans } from 'next/font/google'
import './globals.css'

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--display',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--sans',
})

export const metadata: Metadata = {
  title: 'Amplyfy • Play for your next bite',
  description: 'Spin the wheel for a chance to win an offer on your next order.',
  themeColor: '#ff5b16',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${barlowCondensed.variable} ${dmSans.variable} font-sans bg-[#faf9f6]`}>
        {children}
      </body>
    </html>
  )
}
