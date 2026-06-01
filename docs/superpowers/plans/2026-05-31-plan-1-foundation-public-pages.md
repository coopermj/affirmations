# Affirmations App — Plan 1: Foundation + Public Experience

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js project with Prisma, NextAuth, and working public routes — a visitor can visit a URL or tap an NFC tag and see a full-screen affirmation page with a background image.

**Architecture:** Next.js 14 App Router with a `(public)` route group for visitor pages and an `(admin)` shell (fleshed out in Plans 2–3). All data via Prisma + PostgreSQL. Public pages are fully server-rendered. Background images served from Cloudflare R2 via CSS `background-image`. No background = gradient fallback.

**Tech Stack:** Next.js 14, Prisma 5, PostgreSQL, NextAuth v4 (credentials + JWT), TypeScript, Tailwind CSS 3, `@tiptap/core` (server-side HTML generation), `@tiptap/starter-kit`, `@tiptap/extension-color`, `@tiptap/extension-font-family`, `@tiptap/extension-text-style`, `bcryptjs`, Jest + ts-jest

**This is Plan 1 of 3.** Plan 2 covers the admin dashboard (CRUD for pages, categories, backgrounds, fonts, users). Plan 3 covers the Tiptap page editor.

---

## File Map

```
prisma/
  schema.prisma            # Full data model for the entire app
  seed.ts                  # Admin user + sample categories + sample page

src/
  types/
    next-auth.d.ts         # Augment Session/JWT with role field

  lib/
    db.ts                  # Prisma client singleton
    auth.ts                # NextAuth options (credentials + JWT)
    backgrounds.ts         # selectBackground() — picks background per page settings
    tiptap-renderer.ts     # renderContent(json) — ProseMirror JSON → HTML (server-safe)

  app/
    api/
      auth/
        [...nextauth]/
          route.ts         # NextAuth API handler

    (public)/
      layout.tsx           # Bare layout — no chrome
      page.tsx             # Redirect to /random
      random/
        page.tsx           # Random published page from site
      c/
        [slug]/
          page.tsx         # Random published page from category
      [slug]/
        page.tsx           # Direct page (checks token for private pages)

    (admin)/
      layout.tsx           # Placeholder admin shell (fleshed out in Plan 2)

  components/
    AffirmationPage.tsx    # Full-screen display: background + text overlay
    FontLoader.tsx         # Injects Google font <link> and uploaded font @font-face

  middleware.ts            # Protects /admin/* routes

  __tests__/
    backgrounds.test.ts    # Unit tests for selectBackground()
    tiptap-renderer.test.ts # Unit tests for renderContent()
```

---

## Task 1: Initialize Project

**Files:**
- Create: `package.json` (via create-next-app)
- Create: `next.config.ts`
- Create: `.env.example`
- Create: `jest.config.ts`

- [ ] **Step 1: Scaffold the project**

Run from the *parent* of where the repo lives (one level up from `affirmations/`):

```bash
npx create-next-app@14 affirmations \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-git
```

If the directory already exists (repo was pre-created), run inside it instead:
```bash
npx create-next-app@14 . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-git
```

- [ ] **Step 2: Install additional dependencies**

```bash
npm install \
  @prisma/client \
  "next-auth@^4" \
  @tiptap/core \
  @tiptap/starter-kit \
  @tiptap/extension-color \
  @tiptap/extension-font-family \
  @tiptap/extension-text-style \
  @aws-sdk/client-s3 \
  @aws-sdk/s3-request-presigner \
  bcryptjs \
  uuid

npm install -D \
  prisma \
  @types/bcryptjs \
  @types/uuid \
  jest \
  @types/jest \
  ts-jest \
  jest-environment-node
```

- [ ] **Step 3: Set up Jest config**

Create `jest.config.ts`:
```typescript
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

export default config
```

- [ ] **Step 4: Create `.env.example`**

```env
DATABASE_URL="postgresql://user:password@localhost:5432/affirmations"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_URL="https://<account-id>.r2.cloudflarestorage.com/<bucket-name>"
```

Copy to `.env.local` and fill in real values before running.

- [ ] **Step 5: Update `next.config.ts` to allowlist R2 image hostnames**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: initialize Next.js 14 project with deps and jest config"
```

---

## Task 2: Prisma Schema + Migration

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Write the full schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  EDITOR
}

enum FontType {
  GOOGLE
  UPLOADED
  ADOBE
}

enum BackgroundMode {
  SPECIFIC
  CATEGORY_RANDOM
  DOMAIN_RANDOM
}

enum AccessMode {
  PUBLIC
  PRIVATE
}

enum PageStatus {
  DRAFT
  PUBLISHED
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  passwordHash String
  role         Role     @default(EDITOR)
  createdAt    DateTime @default(now())
  pages        Page[]
}

model Category {
  id          String               @id @default(cuid())
  name        String
  slug        String               @unique
  parentId    String?
  parent      Category?            @relation("CategoryChildren", fields: [parentId], references: [id])
  children    Category[]           @relation("CategoryChildren")
  pages       Page[]
  backgrounds BackgroundCategory[]
  createdAt   DateTime             @default(now())
}

model Background {
  id         String               @id @default(cuid())
  filename   String
  r2Url      String
  mimeType   String
  isAnimated Boolean              @default(false)
  createdAt  DateTime             @default(now())
  pages      Page[]
  categories BackgroundCategory[]
}

model BackgroundCategory {
  backgroundId String
  categoryId   String
  background   Background @relation(fields: [backgroundId], references: [id], onDelete: Cascade)
  category     Category   @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@id([backgroundId, categoryId])
}

model Font {
  id           String   @id @default(cuid())
  name         String
  type         FontType
  googleFamily String?
  r2Url        String?
  createdAt    DateTime @default(now())
}

model SiteSettings {
  id             String  @id @default("singleton")
  adobeEmbedCode String?
}

model Page {
  id             String         @id @default(cuid())
  slug           String         @unique
  title          String
  content        Json
  categoryId     String?
  category       Category?      @relation(fields: [categoryId], references: [id])
  backgroundMode BackgroundMode @default(DOMAIN_RANDOM)
  backgroundId   String?
  background     Background?    @relation(fields: [backgroundId], references: [id])
  accessMode     AccessMode     @default(PUBLIC)
  privateToken   String         @default(uuid())
  status         PageStatus     @default(DRAFT)
  createdById    String
  createdBy      User           @relation(fields: [createdById], references: [id])
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
}
```

- [ ] **Step 2: Run the initial migration**

```bash
npx prisma migrate dev --name init
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 3: Generate the Prisma client**

```bash
npx prisma generate
```

Expected output: `Generated Prisma Client`.

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add full Prisma schema and initial migration"
```

---

## Task 3: Prisma Client Singleton + Seed

**Files:**
- Create: `src/lib/db.ts`
- Create: `prisma/seed.ts`
- Modify: `package.json` (add prisma seed config)

- [ ] **Step 1: Create Prisma client singleton**

Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

- [ ] **Step 2: Write the seed script**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? '<password>', 12)

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
```

- [ ] **Step 3: Add seed script to package.json**

In `package.json`, add inside the top-level object:

```json
"prisma": {
  "seed": "ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts"
}
```

Also install `ts-node` if not present:

```bash
npm install -D ts-node
```

- [ ] **Step 4: Run the seed**

```bash
npx prisma db seed
```

Expected output: `Seed complete.`

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts prisma/seed.ts package.json package-lock.json
git commit -m "feat: add Prisma client singleton and seed data"
```

---

## Task 4: NextAuth + Middleware

**Files:**
- Create: `src/types/next-auth.d.ts`
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/middleware.ts`

- [ ] **Step 1: Augment NextAuth types**

Create `src/types/next-auth.d.ts`:

```typescript
import type { Role } from '@prisma/client'

declare module 'next-auth' {
  interface User {
    role: Role
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: Role
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
  }
}
```

- [ ] **Step 2: Write NextAuth options**

Create `src/lib/auth.ts`:

```typescript
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
```

- [ ] **Step 3: Add the NextAuth API route**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

- [ ] **Step 4: Write middleware**

Create `src/middleware.ts`:

```typescript
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname
    const role = req.nextauth.token?.role

    if (pathname.startsWith('/admin/users') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
)

export const config = {
  matcher: ['/admin/:path*'],
}
```

- [ ] **Step 5: Add admin login placeholder page**

Create `src/app/(admin)/layout.tsx`:

```typescript
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

Create `src/app/(admin)/login/page.tsx`:

```typescript
export default function LoginPage() {
  return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p>Login — coming in Plan 2</p>
    </main>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/types/ src/lib/auth.ts src/app/api/ src/app/\(admin\)/ src/middleware.ts
git commit -m "feat: add NextAuth credentials auth and admin route middleware"
```

---

## Task 5: Background Selection Logic (TDD)

**Files:**
- Create: `src/lib/backgrounds.ts`
- Create: `src/__tests__/backgrounds.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/backgrounds.test.ts`:

```typescript
jest.mock('@/lib/db', () => ({
  db: {
    background: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

import { db } from '@/lib/db'
import { selectBackground } from '@/lib/backgrounds'
import type { Background } from '@prisma/client'

const mockBg = db.background as jest.Mocked<typeof db.background>

const bg1: Background = {
  id: 'bg1', filename: 'a.jpg', r2Url: 'https://r2.example.com/a.jpg',
  mimeType: 'image/jpeg', isAnimated: false, createdAt: new Date(),
}
const bg2: Background = {
  id: 'bg2', filename: 'b.gif', r2Url: 'https://r2.example.com/b.gif',
  mimeType: 'image/gif', isAnimated: true, createdAt: new Date(),
}

beforeEach(() => jest.clearAllMocks())

describe('selectBackground', () => {
  describe('SPECIFIC mode', () => {
    it('returns the background with the given id', async () => {
      mockBg.findUnique.mockResolvedValue(bg1)
      const result = await selectBackground('SPECIFIC', 'bg1', null)
      expect(mockBg.findUnique).toHaveBeenCalledWith({ where: { id: 'bg1' } })
      expect(result).toEqual(bg1)
    })

    it('returns null when backgroundId is null', async () => {
      const result = await selectBackground('SPECIFIC', null, null)
      expect(mockBg.findUnique).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })
  })

  describe('CATEGORY_RANDOM mode', () => {
    it('returns a random background from the category', async () => {
      mockBg.findMany.mockResolvedValue([bg1, bg2])
      const result = await selectBackground('CATEGORY_RANDOM', null, 'cat1')
      expect(mockBg.findMany).toHaveBeenCalledWith({
        where: { categories: { some: { categoryId: 'cat1' } } },
      })
      expect([bg1, bg2]).toContainEqual(result)
    })

    it('falls back to domain random when category has no backgrounds', async () => {
      mockBg.findMany.mockResolvedValueOnce([]) // category query returns empty
      mockBg.count.mockResolvedValue(2)
      mockBg.findMany.mockResolvedValueOnce([bg2]) // domain random query
      const result = await selectBackground('CATEGORY_RANDOM', null, 'cat1')
      expect(result).toEqual(bg2)
    })

    it('returns null when categoryId is null', async () => {
      mockBg.count.mockResolvedValue(0)
      mockBg.findMany.mockResolvedValue([])
      const result = await selectBackground('CATEGORY_RANDOM', null, null)
      expect(result).toBeNull()
    })
  })

  describe('DOMAIN_RANDOM mode', () => {
    it('returns a random background from the full pool', async () => {
      mockBg.count.mockResolvedValue(2)
      mockBg.findMany.mockResolvedValue([bg1])
      const result = await selectBackground('DOMAIN_RANDOM', null, null)
      expect(mockBg.count).toHaveBeenCalled()
      expect(result).toEqual(bg1)
    })

    it('returns null when there are no backgrounds', async () => {
      mockBg.count.mockResolvedValue(0)
      const result = await selectBackground('DOMAIN_RANDOM', null, null)
      expect(result).toBeNull()
    })
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest backgrounds.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/backgrounds'`

- [ ] **Step 3: Implement `selectBackground`**

Create `src/lib/backgrounds.ts`:

```typescript
import { db } from '@/lib/db'
import type { Background } from '@prisma/client'

export async function selectBackground(
  mode: 'SPECIFIC' | 'CATEGORY_RANDOM' | 'DOMAIN_RANDOM',
  backgroundId: string | null,
  categoryId: string | null,
): Promise<Background | null> {
  if (mode === 'SPECIFIC') {
    if (!backgroundId) return null
    return db.background.findUnique({ where: { id: backgroundId } })
  }

  if (mode === 'CATEGORY_RANDOM' && categoryId) {
    const pool = await db.background.findMany({
      where: { categories: { some: { categoryId } } },
    })
    if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)]
  }

  return pickDomainRandom()
}

async function pickDomainRandom(): Promise<Background | null> {
  const count = await db.background.count()
  if (count === 0) return null
  const skip = Math.floor(Math.random() * count)
  const results = await db.background.findMany({ take: 1, skip })
  return results[0] ?? null
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest backgrounds.test.ts
```

Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/backgrounds.ts src/__tests__/backgrounds.test.ts
git commit -m "feat: add background selection logic with tests"
```

---

## Task 6: Tiptap Server-Side Renderer (TDD)

**Files:**
- Create: `src/lib/tiptap-renderer.ts`
- Create: `src/__tests__/tiptap-renderer.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/tiptap-renderer.test.ts`:

```typescript
import { renderContent } from '@/lib/tiptap-renderer'

describe('renderContent', () => {
  it('renders a plain paragraph', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ],
    }
    const html = renderContent(json)
    expect(html).toContain('Hello world')
    expect(html).toContain('<p')
  })

  it('renders bold text', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [{ type: 'bold' }],
              text: 'Bold text',
            },
          ],
        },
      ],
    }
    const html = renderContent(json)
    expect(html).toContain('<strong>')
    expect(html).toContain('Bold text')
  })

  it('renders text with a color mark', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [
                { type: 'textStyle', attrs: { color: '#ff0000', fontFamily: null, fontSize: null } },
              ],
              text: 'Red text',
            },
          ],
        },
      ],
    }
    const html = renderContent(json)
    expect(html).toContain('color: #ff0000')
    expect(html).toContain('Red text')
  })

  it('renders a flourish node', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'flourish', attrs: { symbol: '✦ ── ✦' } },
          ],
        },
      ],
    }
    const html = renderContent(json)
    expect(html).toContain('✦ ── ✦')
    expect(html).toContain('data-flourish')
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest tiptap-renderer.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/tiptap-renderer'`

- [ ] **Step 3: Implement the renderer**

Create `src/lib/tiptap-renderer.ts`:

```typescript
import { generateHTML } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import { Extension, Node, mergeAttributes } from '@tiptap/core'

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element =>
              element.style.fontSize?.replace('px', '') || null,
            renderHTML: attributes => {
              if (!attributes.fontSize) return {}
              return { style: `font-size: ${attributes.fontSize}px` }
            },
          },
        },
      },
    ]
  },
})

const Flourish = Node.create({
  name: 'flourish',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return {
      symbol: { default: '✦ ── ✦' },
    }
  },
  parseHTML() {
    return [{ tag: 'span[data-flourish]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes({ 'data-flourish': '' }, HTMLAttributes),
      HTMLAttributes.symbol as string,
    ]
  },
})

const extensions = [
  StarterKit,
  TextStyle,
  Color,
  FontFamily,
  FontSize,
  Flourish,
]

export function renderContent(json: Record<string, unknown>): string {
  return generateHTML(json, extensions)
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest tiptap-renderer.test.ts
```

Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tiptap-renderer.ts src/__tests__/tiptap-renderer.test.ts
git commit -m "feat: add server-side Tiptap renderer with FontSize and Flourish extensions"
```

---

## Task 7: FontLoader + AffirmationPage Components

**Files:**
- Create: `src/components/FontLoader.tsx`
- Create: `src/components/AffirmationPage.tsx`

- [ ] **Step 1: Write FontLoader**

Create `src/components/FontLoader.tsx`:

```typescript
import type { Font } from '@prisma/client'

interface Props {
  fonts: Font[]
  adobeEmbedCode: string | null
}

export function FontLoader({ fonts, adobeEmbedCode }: Props) {
  const googleFamilies = fonts
    .filter(f => f.type === 'GOOGLE' && f.googleFamily)
    .map(f => encodeURIComponent(f.googleFamily!))

  const uploadedFonts = fonts.filter(f => f.type === 'UPLOADED' && f.r2Url)

  return (
    <>
      {googleFamilies.length > 0 && (
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?${googleFamilies
            .map(f => `family=${f}:wght@100..900`)
            .join('&')}&display=swap`}
        />
      )}
      {uploadedFonts.length > 0 && (
        <style>{uploadedFonts
          .map(
            f => `@font-face {
  font-family: '${f.name}';
  src: url('${f.r2Url}') format('woff2');
  font-display: swap;
}`,
          )
          .join('\n')}</style>
      )}
      {adobeEmbedCode && (
        <link rel="stylesheet" href={adobeEmbedCode} />
      )}
    </>
  )
}
```

- [ ] **Step 2: Write AffirmationPage**

Create `src/components/AffirmationPage.tsx`:

```typescript
interface Props {
  html: string
  backgroundUrl: string | null
  defaultFontFamily: string | null
}

export function AffirmationPage({ html, backgroundUrl, defaultFontFamily }: Props) {
  const background = backgroundUrl
    ? { backgroundImage: `url(${backgroundUrl})` }
    : { background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        ...background,
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: defaultFontFamily ?? 'Georgia, serif',
        }}
      >
        <div
          className="affirmation-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add global affirmation-content styles**

In `src/app/globals.css`, append:

```css
.affirmation-content {
  color: white;
  text-align: center;
  max-width: 640px;
  font-size: 1.5rem;
  line-height: 1.7;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}

.affirmation-content p {
  margin: 0 0 0.5rem;
}

.affirmation-content p:last-child {
  margin-bottom: 0;
}

[data-flourish] {
  display: inline-block;
  margin: 0 0.25rem;
  opacity: 0.8;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ src/app/globals.css
git commit -m "feat: add FontLoader and AffirmationPage components"
```

---

## Task 8: Public Routes

**Files:**
- Modify: `src/app/layout.tsx` (replace create-next-app default)
- Create: `src/app/(public)/layout.tsx`
- Create: `src/app/(public)/page.tsx`
- Create: `src/app/(public)/random/page.tsx`
- Create: `src/app/(public)/c/[slug]/page.tsx`
- Create: `src/app/(public)/[slug]/page.tsx`

- [ ] **Step 1: Update the root layout and create the public layout**

`create-next-app` generates `src/app/layout.tsx` with Geist fonts and default boilerplate. Replace its contents entirely:

```typescript
// src/app/layout.tsx
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
```

Create `src/app/(public)/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { FontLoader } from '@/components/FontLoader'

export const metadata: Metadata = {
  title: 'Affirmations',
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [fonts, settings] = await Promise.all([
    db.font.findMany(),
    db.siteSettings.findUnique({ where: { id: 'singleton' } }),
  ])

  return (
    <>
      {/* React 18 hoists <link rel="stylesheet"> to <head> automatically */}
      <FontLoader fonts={fonts} adobeEmbedCode={settings?.adobeEmbedCode ?? null} />
      {children}
    </>
  )
}
```

Also add `src/app/(public)/layout.tsx` to the **Files** list at the top of this task, and add:
- Modify: `src/app/layout.tsx` (replace create-next-app default)

- [ ] **Step 2: Root redirect**

Create `src/app/(public)/page.tsx`:

```typescript
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/random')
}
```

- [ ] **Step 3: Random page from entire site**

Create `src/app/(public)/random/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { selectBackground } from '@/lib/backgrounds'
import { renderContent } from '@/lib/tiptap-renderer'
import { AffirmationPage } from '@/components/AffirmationPage'

export const dynamic = 'force-dynamic'

export default async function RandomPage() {
  const count = await db.page.count({ where: { status: 'PUBLISHED', accessMode: 'PUBLIC' } })
  if (count === 0) notFound()

  const skip = Math.floor(Math.random() * count)
  const pages = await db.page.findMany({
    where: { status: 'PUBLISHED', accessMode: 'PUBLIC' },
    take: 1,
    skip,
    include: { category: true },
  })
  const page = pages[0]
  if (!page) notFound()

  const background = await selectBackground(
    page.backgroundMode,
    page.backgroundId,
    page.categoryId,
  )
  const html = renderContent(page.content as Record<string, unknown>)

  return (
    <AffirmationPage
      html={html}
      backgroundUrl={background?.r2Url ?? null}
      defaultFontFamily={null}
    />
  )
}
```

- [ ] **Step 4: Random page from category**

Create `src/app/(public)/c/[slug]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { selectBackground } from '@/lib/backgrounds'
import { renderContent } from '@/lib/tiptap-renderer'
import { AffirmationPage } from '@/components/AffirmationPage'

export const dynamic = 'force-dynamic'

export default async function CategoryRandomPage({
  params,
}: {
  params: { slug: string }
}) {
  const category = await db.category.findUnique({ where: { slug: params.slug } })
  if (!category) notFound()

  const count = await db.page.count({
    where: { categoryId: category.id, status: 'PUBLISHED', accessMode: 'PUBLIC' },
  })
  if (count === 0) notFound()

  const skip = Math.floor(Math.random() * count)
  const pages = await db.page.findMany({
    where: { categoryId: category.id, status: 'PUBLISHED', accessMode: 'PUBLIC' },
    take: 1,
    skip,
  })
  const page = pages[0]
  if (!page) notFound()

  const background = await selectBackground(
    page.backgroundMode,
    page.backgroundId,
    page.categoryId,
  )
  const html = renderContent(page.content as Record<string, unknown>)

  return (
    <AffirmationPage
      html={html}
      backgroundUrl={background?.r2Url ?? null}
      defaultFontFamily={null}
    />
  )
}
```

- [ ] **Step 5: Direct page (with private token check)**

Create `src/app/(public)/[slug]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { selectBackground } from '@/lib/backgrounds'
import { renderContent } from '@/lib/tiptap-renderer'
import { AffirmationPage } from '@/components/AffirmationPage'

export const dynamic = 'force-dynamic'

export default async function SlugPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { t?: string }
}) {
  const page = await db.page.findUnique({
    where: { slug: params.slug, status: 'PUBLISHED' },
  })

  // Always 404 on missing or wrong token — never reveal page existence
  if (!page) notFound()
  if (page.accessMode === 'PRIVATE' && searchParams.t !== page.privateToken) notFound()

  const background = await selectBackground(
    page.backgroundMode,
    page.backgroundId,
    page.categoryId,
  )
  const html = renderContent(page.content as Record<string, unknown>)

  return (
    <AffirmationPage
      html={html}
      backgroundUrl={background?.r2Url ?? null}
      defaultFontFamily={null}
    />
  )
}
```

- [ ] **Step 6: Run all tests**

```bash
npx jest
```

Expected: PASS — all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(public\)/
git commit -m "feat: add public affirmation page routes (random, category, direct)"
```

---

## Task 9: Smoke Test + Final Commit

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify routes in browser**

Open each URL and confirm the expected behavior:

| URL | Expected |
|---|---|
| `http://localhost:3000/` | Redirects to `/random` |
| `http://localhost:3000/random` | Full-screen affirmation with gradient background (no backgrounds uploaded yet) |
| `http://localhost:3000/worthy` | Same affirmation ("You are worthy...") |
| `http://localhost:3000/c/encouragement` | Same page (only one published page) |
| `http://localhost:3000/nonexistent` | Next.js 404 page |
| `http://localhost:3000/admin` | Redirects to `/admin/login` |

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Run full test suite one final time**

```bash
npx jest
```

Expected: All tests pass.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: Plan 1 complete — Next.js foundation with public affirmation page display"
```

---

## What's Next

**Plan 2** covers the admin dashboard: sign-in page, admin layout/navigation, pages list, category CRUD, background upload (to R2), font management (Google/uploaded/Adobe), and user management.

**Plan 3** covers the page editor: Tiptap editor with per-selection font/size/color, flourish toolbar, settings panel (slug, background mode, access mode, private token), publish/draft toggle, and full-screen preview mode.
