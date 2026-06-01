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
  try {
    await db.page.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content as never,
        categoryId: data.categoryId,
        backgroundMode: data.backgroundMode,
        backgroundId: data.backgroundId,
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
