'use server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Not signed in')
  return session
}

export interface PasskeySummary {
  id: string
  name: string
  createdAt: string
  lastUsedAt: string | null
}

/** The signed-in user's passkeys, newest first. */
export async function listPasskeys(): Promise<PasskeySummary[]> {
  const session = await requireSession()
  const rows = await db.authenticator.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true, lastUsedAt: true },
  })
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    createdAt: r.createdAt.toISOString(),
    lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
  }))
}

export async function renamePasskey(id: string, name: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession()
  const trimmed = name.trim().slice(0, 60)
  if (!trimmed) return { ok: false, error: 'Name cannot be empty' }
  // Scope to the owner so one user can't rename another's passkey.
  const { count } = await db.authenticator.updateMany({
    where: { id, userId: session.user.id },
    data: { name: trimmed },
  })
  if (count === 0) return { ok: false, error: 'Passkey not found' }
  revalidatePath('/admin/account')
  return { ok: true }
}

export async function deletePasskey(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession()
  const { count } = await db.authenticator.deleteMany({
    where: { id, userId: session.user.id },
  })
  if (count === 0) return { ok: false, error: 'Passkey not found' }
  revalidatePath('/admin/account')
  return { ok: true }
}
