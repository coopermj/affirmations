import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isR2Configured } from '@/lib/r2'

export async function GET() {
  try {
    const [pageCount, userCount] = await Promise.all([
      db.page.count(),
      db.user.count(),
    ])
    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      r2: isR2Configured() ? 'configured' : 'not-configured',
      pages: pageCount,
      users: userCount,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[health] DB error:', msg)
    return NextResponse.json({ status: 'error', db: msg }, { status: 500 })
  }
}
