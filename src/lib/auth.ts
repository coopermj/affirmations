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
          const admin = await db.user.upsert({
            where: { email: envEmail },
            update: { role: 'ADMIN' },
            create: {
              email: envEmail,
              name: 'Admin',
              passwordHash: await bcrypt.hash(envPassword, 12),
              role: 'ADMIN',
            },
          })
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
