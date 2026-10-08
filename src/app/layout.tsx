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
  title: 'Amplyfy • Restaurant Growth Demo',
  description: 'Guests scan, play, and unlock an offer. Grow repeat visits with Amplyfy.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Amplyfy',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-[#080706]">
      <body className={`${barlowCondensed.variable} ${dmSans.variable} font-sans bg-[#080706] text-[#fff0d6] antialiased`}>
        {children}
      </body>
    </html>
  )
}
