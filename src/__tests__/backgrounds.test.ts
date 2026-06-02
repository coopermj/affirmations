jest.mock('@/lib/db', () => ({
  db: {
    background: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

import { db } from '@/lib/db'
import { selectBackground, resolveBackground } from '@/lib/backgrounds'
import type { Background } from '@prisma/client'

const mockBg = db.background as jest.Mocked<typeof db.background>

const bg1: Background = {
  id: 'bg1', filename: 'a.jpg', r2Url: 'https://r2.example.com/a.jpg',
  mimeType: 'image/jpeg', isAnimated: false, isTiled: false, createdAt: new Date(),
}
const bg2: Background = {
  id: 'bg2', filename: 'b.gif', r2Url: 'https://r2.example.com/b.gif',
  mimeType: 'image/gif', isAnimated: true, isTiled: false, createdAt: new Date(),
}

beforeEach(() => jest.clearAllMocks())

describe('selectBackground', () => {
  describe('SPECIFIC mode', () => {
    it('returns the background with the given id', async () => {
      mockBg.findUnique.mockResolvedValue(bg1)
      const result = await selectBackground('SPECIFIC', 'bg1', null)
      expect(mockBg.findUnique).toHaveBeenCalledWith({ where: { id: 'bg1' } })
      expect(result).toEqual(bg1)
    })

    it('returns null when backgroundId is null', async () => {
      const result = await selectBackground('SPECIFIC', null, null)
      expect(mockBg.findUnique).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })
  })

  describe('CATEGORY_RANDOM mode', () => {
    it('returns a random background from the category', async () => {
      mockBg.findMany.mockResolvedValue([bg1, bg2])
      const result = await selectBackground('CATEGORY_RANDOM', null, 'cat1')
      expect(mockBg.findMany).toHaveBeenCalledWith({
        where: { categories: { some: { categoryId: 'cat1' } } },
      })
      expect([bg1, bg2]).toContainEqual(result)
    })

    it('falls back to domain random when category has no backgrounds', async () => {
      mockBg.findMany.mockResolvedValueOnce([]) // category query returns empty
      mockBg.count.mockResolvedValue(2)
      mockBg.findMany.mockResolvedValueOnce([bg2]) // domain random query
      const result = await selectBackground('CATEGORY_RANDOM', null, 'cat1')
      expect(result).toEqual(bg2)
    })

    it('returns null when categoryId is null', async () => {
      mockBg.count.mockResolvedValue(0)
      mockBg.findMany.mockResolvedValue([])
      const result = await selectBackground('CATEGORY_RANDOM', null, null)
      expect(result).toBeNull()
    })
  })

  describe('DOMAIN_RANDOM mode', () => {
    it('returns a random background from the full pool', async () => {
      mockBg.count.mockResolvedValue(2)
      mockBg.findMany.mockResolvedValue([bg1])
      const result = await selectBackground('DOMAIN_RANDOM', null, null)
      expect(mockBg.count).toHaveBeenCalled()
      expect(result).toEqual(bg1)
    })

    it('returns null when there are no backgrounds', async () => {
      mockBg.count.mockResolvedValue(0)
      const result = await selectBackground('DOMAIN_RANDOM', null, null)
      expect(result).toBeNull()
    })
  })
})

describe('resolveBackground', () => {
  const page = { backgroundId: 'bg3', categoryId: null, backgroundGradient: null }

  it('reports tiled=true for a tiled specific background', async () => {
    mockBg.findUnique.mockResolvedValue({ ...bg1, id: 'bg3', isTiled: true })
    const result = await resolveBackground({ ...page, backgroundMode: 'SPECIFIC' })
    expect(result).toEqual({ url: bg1.r2Url, gradient: null, tiled: true })
  })

  it('reports tiled=false for a cover-fit background', async () => {
    mockBg.findUnique.mockResolvedValue({ ...bg1, id: 'bg3', isTiled: false })
    const result = await resolveBackground({ ...page, backgroundMode: 'SPECIFIC' })
    expect(result.tiled).toBe(false)
  })

  it('never tiles a gradient background', async () => {
    const result = await resolveBackground({
      backgroundMode: 'GRADIENT',
      backgroundId: null,
      categoryId: null,
      backgroundGradient: 'last-light',
    })
    expect(result.url).toBeNull()
    expect(result.tiled).toBe(false)
    expect(result.gradient).toBeTruthy()
  })
})
