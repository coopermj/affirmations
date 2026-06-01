/**
 * Reset an admin user's password.
 *
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='new-strong-password' \
 *     npm run set-admin-password
 *
 * Runs against whatever DATABASE_URL is set (locally, .env.local points at the
 * production Railway database via the public proxy URL; on Railway use
 * `railway run npm run set-admin-password`).
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local for standalone runs.
const envLocal = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envLocal)) {
  for (const line of fs.readFileSync(envLocal, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '')
    }
  }
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com'
  const password = process.env.ADMIN_PASSWORD
  if (!password || password.length < 8) {
    throw new Error('Set ADMIN_PASSWORD (min 8 chars). Optionally set ADMIN_EMAIL.')
  }
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await db.user.update({
    where: { email },
    data: { passwordHash },
  })
  console.log(`Password updated for ${user.email}.`)
}

main()
  .catch(e => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
