import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { PageEditor } from '@/components/admin/PageEditor'

export default async function PageEditorPage({
  params,
}: {
  params: { id: string }
}) {
  const [page, categories, backgrounds, fonts] = await Promise.all([
    db.page.findUnique({
      where: { id: params.id },
    }),
    db.category.findMany({ orderBy: { name: 'asc' } }),
    db.background.findMany({ orderBy: { createdAt: 'desc' } }),
    db.font.findMany({ orderBy: { name: 'asc' } }),
  ])

  if (!page) {
    console.error(`[admin/pages/${params.id}] Page not found`)
    notFound()
  }

  return (
    <PageEditor
      page={{
        id: page.id,
        title: page.title,
        slug: page.slug,
        content: page.content as Record<string, unknown>,
        categoryId: page.categoryId,
        backgroundMode: page.backgroundMode,
        backgroundId: page.backgroundId,
        backgroundGradient: page.backgroundGradient,
        accessMode: page.accessMode,
        privateToken: page.privateToken,
        status: page.status,
      }}
      categories={categories}
      backgrounds={backgrounds}
      fonts={fonts}
    />
  )
}
