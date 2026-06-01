import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname
    const role = req.nextauth.token?.role

    if (pathname.startsWith('/admin/users') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/admin/login',
    },
  },
)

export const config = {
  // Protect all /admin/* routes except the login page itself
  matcher: ['/admin/((?!login).*)'],
}
