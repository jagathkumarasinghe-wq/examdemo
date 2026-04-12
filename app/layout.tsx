import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ExamDemo',
  description: 'Digitale Prüfungsplattform Demo',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={geist.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
