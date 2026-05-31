import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
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
  const passwordHash = await bcrypt.hash('admin123', 12)

  const admin = await db.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      passwordHash,
      role: 'ADMIN',
    },
  })

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
