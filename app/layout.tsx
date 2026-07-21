import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Anton, Barlow, Playfair_Display, Saira_Condensed } from 'next/font/google'
import Link from 'next/link'
import { asset } from '@/lib/asset'
import './globals.css'

// Editorial Didone headline.
const playfair = Playfair_Display({
  weight: ['700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-playfair',
})

// Body copy.
const barlow = Barlow({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-barlow',
})

// Athletic condensed — scoreboard labels, tabular numbers, nav.
const saira = Saira_Condensed({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-saira',
})

// Heavy display — oversized rank/score numerals.
const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
})

export const metadata: Metadata = {
  title: 'HLSR Archery Competition',
  description:
    'Houston Livestock Show & Rodeo Archery Competition — qualification standings, single-elimination brackets, and 3D results, powered by Eyes on Score.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const fontClasses = `${playfair.variable} ${barlow.variable} ${saira.variable} ${anton.variable}`
  return (
    <html lang="en" className={fontClasses}>
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <Link
              href="/"
              className="hlsr-wordmark"
              aria-label="Houston Livestock Show & Rodeo Archery Competition"
            >
              <img
                src={asset('/brand/hlsr-archery-badge.png')}
                alt=""
                className="hlsr-badge"
                aria-hidden="true"
              />
              <span className="hlsr-wordmark-text">
                <span className="hlsr-wordmark-title">Houston Livestock Show &amp; Rodeo</span>
                <span className="hlsr-wordmark-sub">Archery Competition</span>
              </span>
            </Link>
          </div>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          Houston Livestock Show &amp; Rodeo · Powered by Eyes on Score
        </footer>
      </body>
    </html>
  )
}
