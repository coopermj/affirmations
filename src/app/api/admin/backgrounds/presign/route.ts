import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPresignedUploadUrl, r2PublicUrl } from '@/lib/r2'
import { randomUUID } from 'crypto'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { filename, contentType } = await req.json()
  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  const ext = filename.split('.').pop() ?? 'bin'
  const key = `backgrounds/${randomUUID()}.${ext}`
  const url = await getPresignedUploadUrl(key, contentType)

  return NextResponse.json({ url, key, publicUrl: r2PublicUrl(key) })
}
