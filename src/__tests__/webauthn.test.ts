import {
  resolveRpConfig,
  toCredentialDescriptors,
  challengeCookieOptions,
  defaultPasskeyName,
} from '@/lib/webauthn'

describe('resolveRpConfig', () => {
  it('prefers explicit WEBAUTHN_* vars', () => {
    const cfg = resolveRpConfig({
      WEBAUTHN_RP_ID: 'affirmations.example.com',
      WEBAUTHN_RP_ORIGIN: 'https://affirmations.example.com',
      WEBAUTHN_RP_NAME: 'Affirmations',
      NEXTAUTH_URL: 'https://ignored.example.com',
    })
    expect(cfg).toEqual({
      rpID: 'affirmations.example.com',
      origin: 'https://affirmations.example.com',
      rpName: 'Affirmations',
    })
  })

  it('derives rpID and origin from NEXTAUTH_URL when WEBAUTHN_* are absent', () => {
    const cfg = resolveRpConfig({ NEXTAUTH_URL: 'https://affirmations.example.com' })
    expect(cfg.rpID).toBe('affirmations.example.com')
    expect(cfg.origin).toBe('https://affirmations.example.com')
    expect(cfg.rpName).toBe('Affirmations')
  })

  it('honors a non-standard port in NEXTAUTH_URL', () => {
    const cfg = resolveRpConfig({ NEXTAUTH_URL: 'http://localhost:3000' })
    expect(cfg.rpID).toBe('localhost')
    expect(cfg.origin).toBe('http://localhost:3000')
  })

  it('falls back to localhost dev defaults with no env', () => {
    const cfg = resolveRpConfig({})
    expect(cfg).toEqual({
      rpID: 'localhost',
      origin: 'http://localhost:3000',
      rpName: 'Affirmations',
    })
  })

  it('falls back to dev defaults when NEXTAUTH_URL is malformed', () => {
    const cfg = resolveRpConfig({ NEXTAUTH_URL: 'not a url' })
    expect(cfg.rpID).toBe('localhost')
    expect(cfg.origin).toBe('http://localhost:3000')
  })
})

describe('toCredentialDescriptors', () => {
  it('maps stored authenticators to id/transports descriptors', () => {
    const result = toCredentialDescriptors([
      { credentialId: 'abc', transports: ['internal', 'hybrid'] },
      { credentialId: 'def', transports: [] },
    ])
    expect(result).toEqual([
      { id: 'abc', transports: ['internal', 'hybrid'] },
      { id: 'def', transports: [] },
    ])
  })

  it('returns an empty array for no authenticators', () => {
    expect(toCredentialDescriptors([])).toEqual([])
  })
})

describe('challengeCookieOptions', () => {
  it('is httpOnly, lax, root-path, with the default TTL', () => {
    const opts = challengeCookieOptions()
    expect(opts.httpOnly).toBe(true)
    expect(opts.sameSite).toBe('lax')
    expect(opts.path).toBe('/')
    expect(opts.maxAge).toBe(300)
  })

  it('accepts a custom maxAge (e.g. 0 to clear)', () => {
    expect(challengeCookieOptions(0).maxAge).toBe(0)
  })
})

describe('defaultPasskeyName', () => {
  it('labels platform authenticators "This device"', () => {
    expect(defaultPasskeyName(['internal', 'hybrid'])).toBe('This device')
  })
  it('labels hybrid (cross-device) authenticators "Phone or tablet"', () => {
    expect(defaultPasskeyName(['hybrid'])).toBe('Phone or tablet')
  })
  it('labels roaming authenticators "Security key"', () => {
    expect(defaultPasskeyName(['usb'])).toBe('Security key')
    expect(defaultPasskeyName(['nfc'])).toBe('Security key')
  })
  it('falls back to "Passkey" for unknown/empty transports', () => {
    expect(defaultPasskeyName([])).toBe('Passkey')
    expect(defaultPasskeyName(undefined)).toBe('Passkey')
  })
})
