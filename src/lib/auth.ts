import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

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
