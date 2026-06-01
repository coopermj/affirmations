import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { resolveBackground } from '@/lib/backgrounds'
import { renderContent } from '@/lib/tiptap-renderer'
import { AffirmationPage } from '@/components/AffirmationPage'

export const dynamic = 'force-dynamic'

export default async function SlugPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { t?: string }
}) {
  const page = await db.page.findUnique({
    where: { slug: params.slug, status: 'PUBLISHED' },
  })

  // Always 404 on missing or wrong token — never reveal page existence
  if (!page) notFound()
  if (page.accessMode === 'PRIVATE' && searchParams.t !== page.privateToken) notFound()

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
