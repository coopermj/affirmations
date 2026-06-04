import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server'
import { db } from '@/lib/db'
import { getRpConfig, AUTH_CHALLENGE_COOKIE, challengeCookieOptions } from '@/lib/webauthn'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Env-defined "break-glass" admin: if ADMIN_EMAIL/ADMIN_PASSWORD are
        // set in the environment and match, always grant admin access and
        // self-heal the database record. This guarantees you can never be
        // locked out as long as you control the Railway variables.
        const envEmail = process.env.ADMIN_EMAIL
        const envPassword = process.env.ADMIN_PASSWORD
        if (
          envEmail &&
          envPassword &&
          credentials.email === envEmail &&
          credentials.password === envPassword
        ) {
          let admin = await db.user.findUnique({ where: { email: envEmail } })
          if (!admin) {
            admin = await db.user.create({
              data: {
                email: envEmail,
                name: 'Admin',
                passwordHash: await bcrypt.hash(envPassword, 12),
                role: 'ADMIN',
              },
            })
          } else {
            // Keep the DB password in sync with the Railway variable. This
            // overwrites any stale password (e.g. the old seed default) so the
            // env value is the single source of truth.
            const inSync = await bcrypt.compare(envPassword, admin.passwordHash)
            if (!inSync || admin.role !== 'ADMIN') {
              admin = await db.user.update({
                where: { id: admin.id },
                data: {
                  role: 'ADMIN',
                  ...(inSync ? {} : { passwordHash: await bcrypt.hash(envPassword, 12) }),
                },
              })
            }
          }
          return { id: admin.id, email: admin.email, name: admin.name, role: admin.role }
        }

        // Normal database-backed authentication.
        const user = await db.user.findUnique({
          where: { email: credentials.email },
        })
        if (!user) return null

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),

    // Passkey (WebAuthn) login. The client first fetches options from
    // /api/auth/passkey/authenticate/options (which sets the challenge cookie),
    // runs the browser ceremony, then calls signIn('passkey', { response }).
    // We verify the assertion here and return the matched user → JWT session.
    CredentialsProvider({
      id: 'passkey',
      name: 'Passkey',
      credentials: { response: { label: 'response', type: 'text' } },
      async authorize(credentials) {
        if (!credentials?.response) return null

        const jar = cookies()
        const expectedChallenge = jar.get(AUTH_CHALLENGE_COOKIE)?.value
        if (!expectedChallenge) return null

        let response: AuthenticationResponseJSON
        try {
          response = JSON.parse(credentials.response)
        } catch {
          return null
        }

        const authenticator = await db.authenticator.findUnique({
          where: { credentialId: response.id },
        })
        if (!authenticator) return null

        const { rpID, origin } = getRpConfig()
        let verification
        try {
          verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            requireUserVerification: false,
            credential: {
              id: authenticator.credentialId,
              publicKey: authenticator.publicKey,
              counter: authenticator.counter,
              transports: authenticator.transports as AuthenticatorTransportFuture[],
            },
          })
        } catch {
          return null
        } finally {
          // Best-effort single-use: invalidate the challenge after an attempt.
          try {
            jar.set(AUTH_CHALLENGE_COOKIE, '', challengeCookieOptions(0))
          } catch {
            // cookie mutation may be unavailable in this context; TTL bounds it
          }
        }

        if (!verification.verified) return null

        await db.authenticator.update({
          where: { id: authenticator.id },
          data: {
            counter: verification.authenticationInfo.newCounter,
            lastUsedAt: new Date(),
          },
        })

        const user = await db.user.findUnique({ where: { id: authenticator.userId } })
        if (!user) return null
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
  pages: {
    signIn: '/admin/login',
  },
}
