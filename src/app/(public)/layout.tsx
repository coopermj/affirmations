import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { FontLoader } from '@/components/FontLoader'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Affirmations',
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [fonts, settings] = await Promise.all([
    db.font.findMany(),
    db.siteSettings.findUnique({ where: { id: 'singleton' } }),
  ])

  return (
    <>
      {/* React 18 hoists <link rel="stylesheet"> to <head> automatically */}
      <FontLoader fonts={fonts} adobeEmbedCode={settings?.adobeEmbedCode ?? null} />
      {children}
    </>
  )
}
