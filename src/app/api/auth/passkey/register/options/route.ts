import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  getRpConfig,
  toCredentialDescriptors,
  REG_CHALLENGE_COOKIE,
  challengeCookieOptions,
} from '@/lib/webauthn'

// Step 1 of registering a passkey (logged-in user). Returns creation options
// and stashes the expected challenge in a short-lived httpOnly cookie.
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { rpID, rpName } = getRpConfig()
  const existing = await db.authenticator.findMany({
    where: { userId: session.user.id },
    select: { credentialId: true, transports: true },
  })

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: session.user.email,
    userDisplayName: session.user.name ?? session.user.email,
    userID: new TextEncoder().encode(session.user.id),
    attestationType: 'none',
    excludeCredentials: toCredentialDescriptors(existing),
    authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
  })

  cookies().set(REG_CHALLENGE_COOKIE, options.challenge, challengeCookieOptions())
  return NextResponse.json(options)
}
