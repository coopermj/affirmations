# Passkey (WebAuthn) Support — Design

**Date:** 2026-06-03
**Status:** Approved

## Goal

Let admins/editors sign in to the Affirmations admin with a passkey (WebAuthn /
FIDO2) in addition to the existing email + password. Usernameless: tap "Sign in
with a passkey", pick a credential from the OS prompt, done — no email typed.

## Decisions

- **Augment, don't replace.** Email/password login and the env "break-glass"
  admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) stay exactly as they are. Passkeys are
  an additional method, so losing a device can never lock you out.
- **Usernameless / discoverable credentials.** Registration uses
  `residentKey: 'required'`; authentication sends an empty `allowCredentials` so
  the browser offers all discoverable credentials for this site.
- **Stay on NextAuth v4 + JWT sessions.** No database-session adapter, no v5
  migration. Passkey login is a second `CredentialsProvider` whose `authorize()`
  verifies the WebAuthn assertion and returns the matched user.

## Approach (chosen)

`@simplewebauthn/server` + `@simplewebauthn/browser` for the ceremony, custom
API routes for the challenge round-trips, and a `passkey` NextAuth provider so a
successful assertion yields a normal JWT session that the existing middleware
already understands.

Rejected: Auth.js v5's experimental Passkey provider (forces DB sessions + a
full v4→v5 migration of a working app) and a separate passkey session outside
NextAuth (two parallel session systems).

## Data model

New Prisma model:

```prisma
model Authenticator {
  id           String   @id @default(cuid())
  credentialId String   @unique           // base64url
  publicKey    Bytes
  counter      Int      @default(0)
  transports   String[]                    // e.g. ["internal","hybrid"]
  name         String                      // friendly label, user-editable
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now())
  lastUsedAt   DateTime?
}
```

`User` gets `authenticators Authenticator[]`. Additive migration; no existing
table changes.

## Flows

### Registration (logged-in user, `/admin/account`)
1. `POST /api/auth/passkey/register/options` — authed. Generates registration
   options (`residentKey: 'required'`, `userVerification: 'preferred'`,
   `excludeCredentials` = the user's existing credentials). Stores the expected
   challenge in a short-lived, signed, httpOnly, secure cookie.
2. Browser runs `startRegistration`, posts the attestation to
   `POST /api/auth/passkey/register/verify`. Server verifies against the
   challenge cookie + session user, then persists an `Authenticator` (defaulting
   `name` to the device/transport, user can rename later).

### Login (usernameless)
1. Login page button calls `POST /api/auth/passkey/authenticate/options`
   (empty `allowCredentials`). Server stores the challenge cookie, returns
   options. Browser runs `startAuthentication`.
2. Browser calls `signIn('passkey', { response, redirect: false })`. The
   `passkey` `CredentialsProvider.authorize()` reads the challenge cookie from
   the request, runs `verifyAuthenticationResponse`, matches `credentialId` →
   `Authenticator` → `User`, updates `counter` + `lastUsedAt`, returns the user.
   NextAuth issues the JWT session as usual.

## Config

Env vars (with fallbacks derived from `NEXTAUTH_URL`):

- `WEBAUTHN_RP_ID` — e.g. `affirmations.example.com` (dev: `localhost`)
- `WEBAUTHN_RP_ORIGIN` — e.g. `https://affirmations.example.com` (dev:
  `http://localhost:3000`)
- `WEBAUTHN_RP_NAME` — display name, default `"Affirmations"`

Added to `.env.example`. RP ID must exactly match the served host or browsers
silently refuse the ceremony.

## UI

- **Login page:** a "Sign in with a passkey" button above/below the password
  form. On unsupported browsers or no credential, it surfaces a friendly message
  and the password form remains.
- **Account page:** a "Passkeys" section listing each passkey (name, created,
  last used) with rename/delete, plus an "Add a passkey" button. A
  `src/lib/actions/passkeys.ts` server-action file backs list/rename/delete.
  Deleting the last passkey is allowed (password + break-glass remain).

## Edge cases

- **Counter = 0 always (Apple/iCloud Keychain, many platform authenticators).**
  Do not reject when the counter does not increase; store whatever verification
  returns.
- **Duplicate registration.** `excludeCredentials` prevents registering the same
  authenticator twice; `credentialId` is unique as a backstop.
- **Unsupported browser.** Feature-detect; hide/disable the passkey button and
  keep password login.

## Testing

Unit tests (Jest) for the pure, deterministic pieces:
- RP config resolution from env and from `NEXTAUTH_URL` fallback (prod vs dev).
- base64url ↔ bytes round-trip helpers.
- "exclude existing credentials" mapping from stored authenticators to
  `excludeCredentials` descriptors.

The full WebAuthn ceremony requires a real authenticator/browser and cannot be
unit-tested meaningfully; it will be verified manually against the live domain
after deploy. No success claim about end-to-end passkey login until that manual
verification passes.

## Out of scope

- Passkey-only (password-less) accounts.
- Email-first (non-discoverable) login.
- Cross-account credential sharing / enterprise attestation policies.
