import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPresignedUploadUrl, r2PublicUrl, isR2Configured } from '@/lib/r2'
import { randomUUID } from 'crypto'

const CONTENT_TYPE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isR2Configured()) {
    return NextResponse.json(
      { error: 'File storage is not configured. Set R2 credentials to enable uploads.' },
      { status: 503 },
    )
  }

  let body: { filename?: string; contentType?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { contentType } = body
  const ext = contentType ? CONTENT_TYPE_EXT[contentType] : undefined
  if (!ext) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  const key = `backgrounds/${randomUUID()}.${ext}`
  try {
    const url = await getPresignedUploadUrl(key, contentType!)
    return NextResponse.json({ url, key, publicUrl: r2PublicUrl(key) })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[backgrounds/presign] failed:', msg)
    return NextResponse.json({ error: `Could not prepare upload: ${msg}` }, { status: 500 })
  }
}
