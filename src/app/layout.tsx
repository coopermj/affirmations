import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Fraunces, Hanken_Grotesk } from 'next/font/google'

const display = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const sans = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Render under the notch / home indicator so the page is truly edge-to-edge.
  viewportFit: 'cover',
  themeColor: '#2c2236',
}

export const metadata: Metadata = {
  title: 'Affirmations',
  // Enables a chromeless, full-screen experience when added to the iOS Home Screen.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Affirmations',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="bg-paper text-ink font-sans antialiased">{children}</body>
    </html>
  )
}
