'use server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/admin')
  return session
}

export async function createUser(formData: FormData) {
  await requireAdmin()
  const email = formData.get('email') as string
  const name = formData.get('name') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as 'ADMIN' | 'EDITOR'
  const passwordHash = await bcrypt.hash(password, 12)
  await db.user.create({ data: { email, name, passwordHash, role } })
  revalidatePath('/admin/users')
}

export async function deleteUser(id: string) {
  const session = await requireAdmin()
  if (session.user.id === id) throw new Error('Cannot delete your own account')
  await db.user.delete({ where: { id } })
  revalidatePath('/admin/users')
}
