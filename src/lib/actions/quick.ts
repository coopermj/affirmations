'use server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { randomBytes } from 'crypto'

async function requireEditor() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')
  return session
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
    .replace(/^-+|-+$/g, '')
}

/** Ensure the default "quick" category exists and return its id. */
export async function ensureQuickCategory(): Promise<string> {
  const cat = await db.category.upsert({
    where: { slug: 'quick' },
    update: {},
    create: { name: 'Quick', slug: 'quick' },
  })
  return cat.id
}

/**
 * One-step upload: store the photo as a background and publish a page that
 * uses it, with the supplied caption and category. Returns the new page slug.
 */
export async function quickUpload(data: {
  text: string
  categoryId: string | null
  filename: string
  r2Url: string
  mimeType: string
}): Promise<{ ok: boolean; slug?: string; error?: string }> {
  const session = await requireEditor()

  try {
    const bg = await db.background.create({
      data: {
        filename: data.filename,
        r2Url: data.r2Url,
        mimeType: data.mimeType,
        isAnimated: data.mimeType === 'image/gif',
        ...(data.categoryId
          ? { categories: { create: [{ categoryId: data.categoryId }] } }
          : {}),
      },
    })

    const text = data.text.trim()
    const base = slugify(text) || 'photo'
    const slug = `${base}-${randomBytes(3).toString('hex')}`

    const content = text
      ? {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              attrs: { textAlign: 'center' },
              content: [{ type: 'text', text }],
            },
          ],
        }
      : { type: 'doc', content: [{ type: 'paragraph' }] }

    await db.page.create({
      data: {
        slug,
        title: text.slice(0, 60) || 'Photo',
        content: content as never,
        categoryId: data.categoryId,
        backgroundMode: 'SPECIFIC',
        backgroundId: bg.id,
        accessMode: 'PUBLIC',
        status: 'PUBLISHED',
        createdById: session.user.id,
      },
    })

    revalidatePath('/admin/pages')
    return { ok: true, slug }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload failed'
    console.error('[quickUpload] failed:', msg)
    return { ok: false, error: msg }
  }
}
