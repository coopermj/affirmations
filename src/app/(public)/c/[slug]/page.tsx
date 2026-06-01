import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { resolveBackground } from '@/lib/backgrounds'
import { renderContent } from '@/lib/tiptap-renderer'
import { AffirmationPage } from '@/components/AffirmationPage'

export const dynamic = 'force-dynamic'

export default async function CategoryRandomPage({
  params,
}: {
  params: { slug: string }
}) {
  const category = await db.category.findUnique({ where: { slug: params.slug } })
  if (!category) notFound()

  const count = await db.page.count({
    where: { categoryId: category.id, status: 'PUBLISHED', accessMode: 'PUBLIC' },
  })
  if (count === 0) notFound()

  const skip = Math.floor(Math.random() * count)
  const pages = await db.page.findMany({
    where: { categoryId: category.id, status: 'PUBLISHED', accessMode: 'PUBLIC' },
    take: 1,
    skip,
  })
  const page = pages[0]
  if (!page) notFound()

  const { url, gradient } = await resolveBackground(page)
  const html = renderContent(page.content as Record<string, unknown>)

  return (
    <AffirmationPage
      html={html}
      backgroundUrl={url}
      backgroundGradient={gradient}
      defaultFontFamily={null}
    />
  )
}
