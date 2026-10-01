import type { Metadata, Viewport } from 'next'
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
  description: 'Choose a game and win an offer on your next order.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#21120e',
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
