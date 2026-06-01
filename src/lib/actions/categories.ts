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

export async function createCategory(formData: FormData) {
  await requireEditor()
  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const parentId = (formData.get('parentId') as string) || null
  await db.category.create({ data: { name, slug, parentId } })
  revalidatePath('/admin/categories')
}

export async function updateCategory(id: string, formData: FormData) {
  await requireEditor()
  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const parentId = (formData.get('parentId') as string) || null
  await db.category.update({ where: { id }, data: { name, slug, parentId } })
  revalidatePath('/admin/categories')
}

export async function deleteCategory(id: string) {
  await requireEditor()
  await db.category.delete({ where: { id } })
  revalidatePath('/admin/categories')
}
