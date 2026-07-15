import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'CUWeave',
  description:
    'An unofficial, student-led academic planning platform for CUHK students.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
