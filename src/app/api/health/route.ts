import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const [pageCount, userCount] = await Promise.all([
      db.page.count(),
      db.user.count(),
    ])
    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      pages: pageCount,
      users: userCount,
      headers: {
        host: req.headers.get('host'),
        xForwardedHost: req.headers.get('x-forwarded-host'),
        xForwardedProto: req.headers.get('x-forwarded-proto'),
        origin: req.headers.get('origin'),
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[health] DB error:', msg)
    return NextResponse.json({ status: 'error', db: msg }, { status: 500 })
  }
}
