'use server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

/**
 * Change the signed-in user's own password. Verifies the current password
 * before updating. Returns a result object so the form can show feedback.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session) return { ok: false, error: 'Not signed in' }

  if (!newPassword || newPassword.length < 8) {
    return { ok: false, error: 'New password must be at least 8 characters' }
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) return { ok: false, error: 'Account not found' }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) return { ok: false, error: 'Current password is incorrect' }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await db.user.update({ where: { id: user.id }, data: { passwordHash } })
  return { ok: true }
}
