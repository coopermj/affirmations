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

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/admin')
  return session
}

export async function addGoogleFont(formData: FormData) {
  await requireEditor()
  const name = formData.get('name') as string
  await db.font.create({
    data: { name, type: 'GOOGLE', googleFamily: name },
  })
  revalidatePath('/admin/fonts')
}

export async function saveFontUpload(name: string, r2Url: string) {
  await requireEditor()
  await db.font.create({
    data: { name, type: 'UPLOADED', r2Url },
  })
  revalidatePath('/admin/fonts')
}

export async function deleteFont(id: string, r2Key: string | null) {
  await requireEditor()
  await db.font.delete({ where: { id } })
  if (r2Key) await deleteR2Object(r2Key)
  revalidatePath('/admin/fonts')
}

export async function setAdobeEmbedCode(formData: FormData) {
  await requireAdmin()
  const code = (formData.get('code') as string) || null
  await db.siteSettings.upsert({
    where: { id: 'singleton' },
    update: { adobeEmbedCode: code },
    create: { id: 'singleton', adobeEmbedCode: code },
  })
  revalidatePath('/admin/fonts')
}

export async function addAdobeFont(formData: FormData) {
  await requireAdmin()
  const name = formData.get('name') as string
  await db.font.create({ data: { name, type: 'ADOBE' } })
  revalidatePath('/admin/fonts')
}
