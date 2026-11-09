import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Church setup | LifeStages',
  description: 'Manage your church’s app appearance, leadership contact, and published sermons.',
  robots: { index: false, follow: false },
}

export default function ChurchManageLayout({ children }: { children: ReactNode }) {
  return children
}
