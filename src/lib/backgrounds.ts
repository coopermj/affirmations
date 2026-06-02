import { db } from '@/lib/db'
import type { Background, BackgroundMode } from '@prisma/client'
import { gradientCss } from '@/lib/gradients'

/**
 * Resolve the background to render for a page: a gradient (GRADIENT mode) or an
 * image URL (all other modes). Returns at most one of the two.
 */
export async function resolveBackground(page: {
  backgroundMode: BackgroundMode
  backgroundId: string | null
  categoryId: string | null
  backgroundGradient: string | null
}): Promise<{ url: string | null; gradient: string | null; tiled: boolean }> {
  if (page.backgroundMode === 'GRADIENT') {
    return { url: null, gradient: gradientCss(page.backgroundGradient), tiled: false }
  }
  const bg = await selectBackground(
    page.backgroundMode as 'SPECIFIC' | 'CATEGORY_RANDOM' | 'DOMAIN_RANDOM',
    page.backgroundId,
    page.categoryId,
  )
  return { url: bg?.r2Url ?? null, gradient: null, tiled: bg?.isTiled ?? false }
}

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
