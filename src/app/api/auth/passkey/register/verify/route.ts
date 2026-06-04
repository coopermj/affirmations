import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  getRpConfig,
  defaultPasskeyName,
  REG_CHALLENGE_COOKIE,
  challengeCookieOptions,
} from '@/lib/webauthn'

// Step 2 of registering a passkey. Verifies the attestation against the stashed
// challenge and the session user, then persists the credential.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const jar = cookies()
  const expectedChallenge = jar.get(REG_CHALLENGE_COOKIE)?.value
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'Challenge expired — please try again' }, { status: 400 })
  }

  const body = (await req.json()) as { response: RegistrationResponseJSON; name?: string }
  const { rpID, origin } = getRpConfig()

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Verification failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  } finally {
    jar.set(REG_CHALLENGE_COOKIE, '', challengeCookieOptions(0))
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: 'Could not verify passkey' }, { status: 400 })
  }

  const { credential } = verification.registrationInfo
  const name =
    (body.name && body.name.trim().slice(0, 60)) || defaultPasskeyName(credential.transports)

  try {
    await db.authenticator.create({
      data: {
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports ?? [],
        name,
        userId: session.user.id,
      },
    })
  } catch (e) {
    // Unique constraint → this passkey is already registered.
    const msg = e instanceof Error && e.message.includes('Unique')
      ? 'This passkey is already registered'
      : 'Could not save passkey'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  return NextResponse.json({ ok: true, name })
}
