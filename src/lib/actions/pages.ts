'use server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireEditor() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')
  return session
}

export async function deletePage(id: string) {
  await requireEditor()
  await db.page.delete({ where: { id } })
  revalidatePath('/admin/pages')
}

export async function createPage(formData: FormData) {
  const session = await requireEditor()
  const slug = formData.get('slug') as string
  const title = (formData.get('title') as string) || slug
  const page = await db.page.create({
    data: {
      slug,
      title,
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      createdById: session.user.id,
    },
  })
  redirect(`/admin/pages/${page.id}`)
}

export async function savePage(
  id: string,
  data: {
    title: string
    slug: string
    content: Record<string, unknown>
    categoryId: string | null
    backgroundMode: 'SPECIFIC' | 'CATEGORY_RANDOM' | 'DOMAIN_RANDOM'
    backgroundId: string | null
    accessMode: 'PUBLIC' | 'PRIVATE'
    status: 'DRAFT' | 'PUBLISHED'
  },
) {
  await requireEditor()

  // A specific background only applies in SPECIFIC mode. In any other mode,
  // force it null so a stale selection never gets persisted.
  let backgroundId = data.backgroundMode === 'SPECIFIC' ? data.backgroundId : null

  // Guard against a background that was deleted (or never existed): writing a
  // dangling id would violate the Page_backgroundId_fkey constraint.
  if (backgroundId) {
    const exists = await db.background.findUnique({
      where: { id: backgroundId },
      select: { id: true },
    })
    if (!exists) backgroundId = null
  }

  // Likewise guard the category foreign key.
  let categoryId = data.categoryId
  if (categoryId) {
    const exists = await db.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    })
    if (!exists) categoryId = null
  }

  try {
    await db.page.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content as never,
        categoryId,
        backgroundMode: data.backgroundMode,
        backgroundId,
        accessMode: data.accessMode,
        status: data.status,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[savePage] update failed for ${id}:`, msg)
    throw new Error(msg)
  }
  revalidatePath(`/admin/pages/${id}`)
  revalidatePath(`/${data.slug}`)
}
