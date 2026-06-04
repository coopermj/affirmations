import type { AuthenticatorTransportFuture } from '@simplewebauthn/server'

// Relying Party (RP) configuration for WebAuthn. The RP ID must exactly match
// the host the app is served from, or browsers silently refuse the ceremony.
export interface RpConfig {
  rpID: string
  origin: string
  rpName: string
}

type Env = Record<string, string | undefined>

/**
 * Resolve RP config from explicit WEBAUTHN_* vars, falling back to NEXTAUTH_URL,
 * then to localhost dev defaults. Pure (takes env) so it can be unit-tested.
 */
export function resolveRpConfig(env: Env): RpConfig {
  const rpName = env.WEBAUTHN_RP_NAME || 'Affirmations'
  let rpID = env.WEBAUTHN_RP_ID
  let origin = env.WEBAUTHN_RP_ORIGIN

  if ((!rpID || !origin) && env.NEXTAUTH_URL) {
    try {
      const u = new URL(env.NEXTAUTH_URL)
      rpID = rpID || u.hostname
      origin = origin || u.origin
    } catch {
      // malformed NEXTAUTH_URL — fall through to dev defaults
    }
  }

  return {
    rpID: rpID || 'localhost',
    origin: origin || 'http://localhost:3000',
    rpName,
  }
}

export function getRpConfig(): RpConfig {
  return resolveRpConfig(process.env)
}

// ---- Challenge cookies ----
// The expected challenge is stashed in a short-lived httpOnly cookie between
// the "options" request and the "verify" request. It needn't be encrypted: the
// security comes from the authenticator signing the challenge plus the origin /
// RP ID checks, so a tampered cookie just fails verification.

export const REG_CHALLENGE_COOKIE = 'webauthn-reg-challenge'
export const AUTH_CHALLENGE_COOKIE = 'webauthn-auth-challenge'
export const CHALLENGE_TTL_SECONDS = 300

export function challengeCookieOptions(maxAge: number = CHALLENGE_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

// ---- Credential descriptor mapping ----

interface StoredAuthenticator {
  credentialId: string
  transports: string[]
}

/**
 * Map stored authenticators to the {id, transports} descriptors used for
 * `excludeCredentials` (registration) and `allowCredentials` (authentication).
 */
export function toCredentialDescriptors(
  authenticators: StoredAuthenticator[],
): { id: string; transports: AuthenticatorTransportFuture[] }[] {
  return authenticators.map(a => ({
    id: a.credentialId,
    transports: a.transports as AuthenticatorTransportFuture[],
  }))
}

/**
 * A friendly default label for a freshly-registered passkey, inferred from its
 * transports. The user can rename it afterward.
 */
export function defaultPasskeyName(transports: string[] | undefined): string {
  const t = transports ?? []
  if (t.includes('internal')) return 'This device'
  if (t.includes('hybrid')) return 'Phone or tablet'
  if (t.includes('usb') || t.includes('nfc') || t.includes('ble')) return 'Security key'
  return 'Passkey'
}
