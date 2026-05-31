import { db } from '@/lib/db'
import type { Background } from '@prisma/client'

export async function selectBackground(
  mode: 'SPECIFIC' | 'CATEGORY_RANDOM' | 'DOMAIN_RANDOM',
  backgroundId: string | null,
  categoryId: string | null,
): Promise<Background | null> {
  if (mode === 'SPECIFIC') {
    if (!backgroundId) return null
    return db.background.findUnique({ where: { id: backgroundId } })
  }

  if (mode === 'CATEGORY_RANDOM' && categoryId) {
    const pool = await db.background.findMany({
      where: { categories: { some: { categoryId } } },
    })
    if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)]
  }

  return pickDomainRandom()
}

async function pickDomainRandom(): Promise<Background | null> {
  const count = await db.background.count()
  if (count === 0) return null
  const skip = Math.floor(Math.random() * count)
  const results = await db.background.findMany({ take: 1, skip })
  return results[0] ?? null
}
