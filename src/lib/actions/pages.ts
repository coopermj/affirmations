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
