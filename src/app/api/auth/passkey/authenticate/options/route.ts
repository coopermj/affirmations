import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { getRpConfig, AUTH_CHALLENGE_COOKIE, challengeCookieOptions } from '@/lib/webauthn'

// Step 1 of passkey login (public). Empty allowCredentials → the browser offers
// any discoverable credential for this site (usernameless). The actual sign-in
// happens via NextAuth's `passkey` provider once the assertion is produced.
export async function POST() {
  const { rpID } = getRpConfig()

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
  })

  cookies().set(AUTH_CHALLENGE_COOKIE, options.challenge, challengeCookieOptions())
  return NextResponse.json(options)
}
