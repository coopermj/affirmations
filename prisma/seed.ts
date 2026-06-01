import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local so the seed works when run standalone via ts-node
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
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com'
  // Never hardcode a password. Use SEED_ADMIN_PASSWORD if provided, otherwise
  // generate a strong random one and print it once so it can be recorded.
  let adminPassword = process.env.SEED_ADMIN_PASSWORD
  let generated = false
  if (!adminPassword) {
    adminPassword = randomBytes(12).toString('base64url')
    generated = true
  }
  const passwordHash = await bcrypt.hash(adminPassword, 12)

  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Admin',
      passwordHash,
      role: 'ADMIN',
    },
  })

  if (generated && admin) {
    console.log(`\n  Admin account: ${adminEmail}`)
    console.log(`  Generated password (save this now): ${adminPassword}\n`)
  }

  const encouragement = await db.category.upsert({
    where: { slug: 'encouragement' },
    update: {},
    create: { name: 'Encouragement', slug: 'encouragement' },
  })

  await db.category.upsert({
    where: { slug: 'self-worth' },
    update: {},
    create: {
      name: 'Self-Worth',
      slug: 'self-worth',
      parentId: encouragement.id,
    },
  })

  await db.siteSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  })

  await db.page.upsert({
    where: { slug: 'worthy' },
    update: {},
    create: {
      slug: 'worthy',
      title: 'You Are Worthy',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'You are worthy of every good thing coming your way.',
              },
            ],
          },
        ],
      },
      categoryId: encouragement.id,
      backgroundMode: 'DOMAIN_RANDOM',
      accessMode: 'PUBLIC',
      status: 'PUBLISHED',
      createdById: admin.id,
    },
  })

  console.log('Seed complete.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
