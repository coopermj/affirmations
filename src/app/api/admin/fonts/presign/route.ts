import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPresignedUploadUrl, r2PublicUrl } from '@/lib/r2'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { filename?: string; contentType?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { filename, contentType } = body
  const ext = filename?.split('.').pop()?.toLowerCase()
  if (!ext || !['woff2', 'woff'].includes(ext)) {
    return NextResponse.json({ error: 'Only .woff2 and .woff files are allowed' }, { status: 400 })
  }

  const key = `fonts/${randomUUID()}.${ext}`
  const url = await getPresignedUploadUrl(key, contentType ?? 'application/octet-stream')

  return NextResponse.json({ url, key, publicUrl: r2PublicUrl(key) })
}
