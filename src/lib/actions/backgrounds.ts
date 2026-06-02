'use server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { deleteR2Object } from '@/lib/r2'

async function requireEditor() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')
  return session
}

export async function saveBackground(
  filename: string,
  key: string,
  r2Url: string,
  mimeType: string,
  isAnimated: boolean,
  isTiled: boolean,
  categoryIds: string[],
) {
  await requireEditor()
  await db.background.create({
    data: {
      filename,
      r2Url,
      mimeType,
      isAnimated,
      isTiled,
      categories: {
        create: categoryIds.map(categoryId => ({ categoryId })),
      },
    },
  })
  revalidatePath('/admin/backgrounds')
}

export async function deleteBackground(id: string, r2Key: string) {
  await requireEditor()
  await db.background.delete({ where: { id } })
  await deleteR2Object(r2Key)
  revalidatePath('/admin/backgrounds')
}

export async function setBackgroundCategories(id: string, categoryIds: string[]) {
  await requireEditor()
  await db.backgroundCategory.deleteMany({ where: { backgroundId: id } })
  if (categoryIds.length > 0) {
    await db.backgroundCategory.createMany({
      data: categoryIds.map(categoryId => ({ backgroundId: id, categoryId })),
    })
  }
  revalidatePath('/admin/backgrounds')
}
