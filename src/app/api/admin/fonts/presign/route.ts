import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPresignedUploadUrl, r2PublicUrl } from '@/lib/r2'
import { randomUUID } from 'crypto'

const ALLOWED_TYPES = ['font/woff2', 'font/woff', 'application/font-woff2', 'application/font-woff', 'application/octet-stream']

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { filename, contentType } = await req.json()

  const ext = filename.split('.').pop()?.toLowerCase()
  if (!['woff2', 'woff'].includes(ext ?? '')) {
    return NextResponse.json({ error: 'Only .woff2 and .woff files are allowed' }, { status: 400 })
  }

  const key = `fonts/${randomUUID()}.${ext}`
  const url = await getPresignedUploadUrl(key, contentType)

  return NextResponse.json({ url, key, publicUrl: r2PublicUrl(key) })
}
