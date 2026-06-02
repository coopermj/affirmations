import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { resolveBackground } from '@/lib/backgrounds'
import { renderContent } from '@/lib/tiptap-renderer'
import { AffirmationPage } from '@/components/AffirmationPage'

export const dynamic = 'force-dynamic'

export default async function RandomPage() {
  const count = await db.page.count({ where: { status: 'PUBLISHED', accessMode: 'PUBLIC' } })
  if (count === 0) notFound()

  const skip = Math.floor(Math.random() * count)
  const pages = await db.page.findMany({
    where: { status: 'PUBLISHED', accessMode: 'PUBLIC' },
    take: 1,
    skip,
  })
  const page = pages[0]
  if (!page) notFound()

  const { url, gradient, tiled } = await resolveBackground(page)
  const html = renderContent(page.content as Record<string, unknown>)

  return (
    <AffirmationPage
      html={html}
      backgroundUrl={url}
      backgroundGradient={gradient}
      backgroundTiled={tiled}
      textEffect={page.textEffect}
      defaultFontFamily={null}
    />
  )
}
