# Affirmations App — Plan 2: Admin Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full admin dashboard — login form, navigation shell, and CRUD for categories, backgrounds, fonts, users, and a pages list.

**Architecture:** All admin pages live under `src/app/admin/(auth)/` (a route group that adds the navigation shell and server-side session check). The login page at `src/app/admin/login/page.tsx` is outside the shell. Server Actions handle all mutations. R2 uploads use presigned URLs so files go browser→R2 directly, not through the Next.js server.

**Tech Stack:** Next.js 14 App Router, Prisma 7, NextAuth v4, `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (R2), bcryptjs, Tailwind CSS, Server Actions (`'use server'`), `getServerSession`

**This is Plan 2 of 3.** Plan 3 covers the Tiptap page editor.

**Prerequisite:** R2 credentials must be set in both `.env.local` (local) and Railway environment variables (production): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`.

---

## File Map

```
src/
  app/
    admin/
      (auth)/
        layout.tsx              # Shell: session check + sidebar nav
        page.tsx                # Dashboard: summary counts + quick links
        pages/
          page.tsx              # Pages list (read + delete; edit/create in Plan 3)
        categories/
          page.tsx              # Category CRUD: list + create + edit + delete
        backgrounds/
          page.tsx              # Background gallery + upload form + category tagging
        fonts/
          page.tsx              # Google font add + WOFF2 upload + Adobe embed code
        users/
          page.tsx              # User list + create + delete (admin only)
      login/
        page.tsx                # REPLACE placeholder — real login form (client component)

    api/
      admin/
        backgrounds/
          presign/
            route.ts            # POST: generate R2 presigned URL for background upload
        fonts/
          presign/
            route.ts            # POST: generate R2 presigned URL for font upload

  lib/
    r2.ts                       # R2 S3 client, getPresignedUploadUrl(), deleteObject(), r2PublicUrl()
    actions/
      categories.ts             # createCategory, updateCategory, deleteCategory
      backgrounds.ts            # saveBackground, deleteBackground, setBackgroundCategories
      fonts.ts                  # addGoogleFont, saveFontUpload, deleteFont, setAdobeEmbedCode
      pages.ts                  # deletePage
      users.ts                  # createUser, deleteUser

  components/
    admin/
      AdminNav.tsx              # Sidebar nav (client component — uses usePathname + signOut)
      BackgroundUploader.tsx    # Client component — file picker → presign → R2 PUT → saveBackground
      FontUploader.tsx          # Client component — WOFF2 file picker → presign → R2 PUT → saveFontUpload
```

---

## Task 1: Login Form (Real) + Admin Shell

**Files:**
- Modify: `src/app/admin/login/page.tsx` (replace placeholder)
- Create: `src/app/admin/(auth)/layout.tsx`
- Create: `src/components/admin/AdminNav.tsx`

- [ ] **Step 1: Replace login placeholder with real form**

Replace entire contents of `src/app/admin/login/page.tsx`:

```typescript
'use client'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: fd.get('email'),
      password: fd.get('password'),
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError('Invalid email or password')
    } else {
      router.push('/admin')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-sm w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-6 text-gray-900">Affirmations Admin</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              name="password"
              type="password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Create AdminNav component**

Create `src/components/admin/AdminNav.tsx`:

```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { Role } from '@prisma/client'

interface Props {
  role: Role
}

export function AdminNav({ role }: Props) {
  const pathname = usePathname()

  const items = [
    { href: '/admin', label: 'Dashboard', exact: true },
    { href: '/admin/pages', label: 'Pages', exact: false },
    { href: '/admin/categories', label: 'Categories', exact: false },
    { href: '/admin/backgrounds', label: 'Backgrounds', exact: false },
    { href: '/admin/fonts', label: 'Fonts', exact: false },
    ...(role === 'ADMIN' ? [{ href: '/admin/users', label: 'Users', exact: false }] : []),
  ]

  return (
    <nav className="w-52 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="px-4 py-4 border-b border-gray-200">
        <span className="text-indigo-600 font-semibold text-sm">Affirmations</span>
      </div>
      <div className="flex-1 py-2">
        {items.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-2 text-sm ${
                active
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Create admin auth layout**

Create `src/app/admin/(auth)/layout.tsx`:

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminNav } from '@/components/admin/AdminNav'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNav role={session.user.role} />
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Verify locally**

```bash
npm run dev
```

Open `http://localhost:3000/admin` — should redirect to login.
Open `http://localhost:3000/admin/login` — should show the login form.
Sign in with `admin@example.com` / `admin123` — should redirect to `/admin` (404 is fine, the dashboard page doesn't exist yet).

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/login/page.tsx src/app/admin/\(auth\)/ src/components/admin/AdminNav.tsx
git commit -m "feat: real login form and admin shell layout"
```

---

## Task 2: R2 Client + Presign API Routes

**Files:**
- Create: `src/lib/r2.ts`
- Create: `src/app/api/admin/backgrounds/presign/route.ts`
- Create: `src/app/api/admin/fonts/presign/route.ts`

- [ ] **Step 1: Create R2 client**

Create `src/lib/r2.ts`:

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(r2, command, { expiresIn })
}

export async function deleteR2Object(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }),
  )
}

export function r2PublicUrl(key: string): string {
  return `${process.env.R2_PUBLIC_URL!}/${key}`
}
```

- [ ] **Step 2: Create backgrounds presign route**

Create `src/app/api/admin/backgrounds/presign/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPresignedUploadUrl, r2PublicUrl } from '@/lib/r2'
import { randomUUID } from 'crypto'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { filename, contentType } = await req.json()
  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  const ext = filename.split('.').pop() ?? 'bin'
  const key = `backgrounds/${randomUUID()}.${ext}`
  const url = await getPresignedUploadUrl(key, contentType)

  return NextResponse.json({ url, key, publicUrl: r2PublicUrl(key) })
}
```

- [ ] **Step 3: Create fonts presign route**

Create `src/app/api/admin/fonts/presign/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPresignedUploadUrl, r2PublicUrl } from '@/lib/r2'
import { randomUUID } from 'crypto'

const ALLOWED_TYPES = ['font/woff2', 'font/woff', 'application/font-woff2', 'application/font-woff', 'application/octet-stream']

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { filename, contentType } = await req.json()

  const ext = filename.split('.').pop()?.toLowerCase()
  if (!['woff2', 'woff'].includes(ext ?? '')) {
    return NextResponse.json({ error: 'Only .woff2 and .woff files are allowed' }, { status: 400 })
  }

  const key = `fonts/${randomUUID()}.${ext}`
  const url = await getPresignedUploadUrl(key, contentType)

  return NextResponse.json({ url, key, publicUrl: r2PublicUrl(key) })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/r2.ts src/app/api/admin/
git commit -m "feat: R2 client and presigned URL API routes for backgrounds and fonts"
```

---

## Task 3: Server Actions

**Files:**
- Create: `src/lib/actions/categories.ts`
- Create: `src/lib/actions/backgrounds.ts`
- Create: `src/lib/actions/fonts.ts`
- Create: `src/lib/actions/pages.ts`
- Create: `src/lib/actions/users.ts`

- [ ] **Step 1: Create shared auth helper + categories actions**

Create `src/lib/actions/categories.ts`:

```typescript
'use server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireEditor() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')
  return session
}

export async function createCategory(formData: FormData) {
  await requireEditor()
  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const parentId = (formData.get('parentId') as string) || null
  await db.category.create({ data: { name, slug, parentId } })
  revalidatePath('/admin/categories')
}

export async function updateCategory(id: string, formData: FormData) {
  await requireEditor()
  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const parentId = (formData.get('parentId') as string) || null
  await db.category.update({ where: { id }, data: { name, slug, parentId } })
  revalidatePath('/admin/categories')
}

export async function deleteCategory(id: string) {
  await requireEditor()
  await db.category.delete({ where: { id } })
  revalidatePath('/admin/categories')
}
```

- [ ] **Step 2: Create backgrounds actions**

Create `src/lib/actions/backgrounds.ts`:

```typescript
'use server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { deleteR2Object } from '@/lib/r2'

async function requireEditor() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')
  return session
}

export async function saveBackground(
  filename: string,
  key: string,
  r2Url: string,
  mimeType: string,
  isAnimated: boolean,
  categoryIds: string[],
) {
  await requireEditor()
  await db.background.create({
    data: {
      filename,
      r2Url,
      mimeType,
      isAnimated,
      categories: {
        create: categoryIds.map(categoryId => ({ categoryId })),
      },
    },
  })
  revalidatePath('/admin/backgrounds')
}

export async function deleteBackground(id: string, r2Key: string) {
  await requireEditor()
  await db.background.delete({ where: { id } })
  await deleteR2Object(r2Key)
  revalidatePath('/admin/backgrounds')
}

export async function setBackgroundCategories(id: string, categoryIds: string[]) {
  await requireEditor()
  await db.backgroundCategory.deleteMany({ where: { backgroundId: id } })
  if (categoryIds.length > 0) {
    await db.backgroundCategory.createMany({
      data: categoryIds.map(categoryId => ({ backgroundId: id, categoryId })),
    })
  }
  revalidatePath('/admin/backgrounds')
}
```

- [ ] **Step 3: Create fonts actions**

Create `src/lib/actions/fonts.ts`:

```typescript
'use server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { deleteR2Object } from '@/lib/r2'

async function requireEditor() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')
  return session
}

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/admin')
  return session
}

export async function addGoogleFont(formData: FormData) {
  await requireEditor()
  const name = formData.get('name') as string
  await db.font.create({
    data: { name, type: 'GOOGLE', googleFamily: name },
  })
  revalidatePath('/admin/fonts')
}

export async function saveFontUpload(name: string, r2Url: string) {
  await requireEditor()
  await db.font.create({
    data: { name, type: 'UPLOADED', r2Url },
  })
  revalidatePath('/admin/fonts')
}

export async function deleteFont(id: string, r2Key: string | null) {
  await requireEditor()
  await db.font.delete({ where: { id } })
  if (r2Key) await deleteR2Object(r2Key)
  revalidatePath('/admin/fonts')
}

export async function setAdobeEmbedCode(formData: FormData) {
  await requireAdmin()
  const code = (formData.get('code') as string) || null
  await db.siteSettings.upsert({
    where: { id: 'singleton' },
    update: { adobeEmbedCode: code },
    create: { id: 'singleton', adobeEmbedCode: code },
  })
  revalidatePath('/admin/fonts')
}

export async function addAdobeFont(formData: FormData) {
  await requireAdmin()
  const name = formData.get('name') as string
  await db.font.create({ data: { name, type: 'ADOBE' } })
  revalidatePath('/admin/fonts')
}
```

- [ ] **Step 4: Create pages actions**

Create `src/lib/actions/pages.ts`:

```typescript
'use server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireEditor() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')
  return session
}

export async function deletePage(id: string) {
  await requireEditor()
  await db.page.delete({ where: { id } })
  revalidatePath('/admin/pages')
}

export async function createPage(formData: FormData) {
  const session = await requireEditor()
  const slug = formData.get('slug') as string
  const title = formData.get('title') as string || slug
  const page = await db.page.create({
    data: {
      slug,
      title,
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      createdById: session.user.id,
    },
  })
  redirect(`/admin/pages/${page.id}`)
}
```

- [ ] **Step 5: Create users actions**

Create `src/lib/actions/users.ts`:

```typescript
'use server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/admin')
  return session
}

export async function createUser(formData: FormData) {
  await requireAdmin()
  const email = formData.get('email') as string
  const name = formData.get('name') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as 'ADMIN' | 'EDITOR'
  const passwordHash = await bcrypt.hash(password, 12)
  await db.user.create({ data: { email, name, passwordHash, role } })
  revalidatePath('/admin/users')
}

export async function deleteUser(id: string) {
  const session = await requireAdmin()
  if (session.user.id === id) throw new Error('Cannot delete your own account')
  await db.user.delete({ where: { id } })
  revalidatePath('/admin/users')
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/ src/lib/r2.ts
git commit -m "feat: server actions for categories, backgrounds, fonts, pages, users"
```

---

## Task 4: Dashboard Overview Page

**Files:**
- Create: `src/app/admin/(auth)/page.tsx`

- [ ] **Step 1: Create dashboard**

Create `src/app/admin/(auth)/page.tsx`:

```typescript
import { db } from '@/lib/db'
import Link from 'next/link'

export default async function DashboardPage() {
  const [pages, backgrounds, fonts, categories, users] = await Promise.all([
    db.page.count(),
    db.background.count(),
    db.font.count(),
    db.category.count(),
    db.user.count(),
  ])

  const stats = [
    { label: 'Pages', count: pages, href: '/admin/pages' },
    { label: 'Backgrounds', count: backgrounds, href: '/admin/backgrounds' },
    { label: 'Fonts', count: fonts, href: '/admin/fonts' },
    { label: 'Categories', count: categories, href: '/admin/categories' },
    { label: 'Users', count: users, href: '/admin/users' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map(s => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
          >
            <div className="text-3xl font-bold text-indigo-600">{s.count}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify locally**

```bash
npm run dev
```

Sign in at `http://localhost:3000/admin/login`, then verify `http://localhost:3000/admin` shows the dashboard with counts.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(auth\)/page.tsx
git commit -m "feat: admin dashboard overview with entity counts"
```

---

## Task 5: Category CRUD

**Files:**
- Create: `src/app/admin/(auth)/categories/page.tsx`

- [ ] **Step 1: Create categories page**

Create `src/app/admin/(auth)/categories/page.tsx`:

```typescript
import { db } from '@/lib/db'
import { createCategory, updateCategory, deleteCategory } from '@/lib/actions/categories'

export default async function CategoriesPage() {
  const categories = await db.category.findMany({
    include: { parent: true, _count: { select: { pages: true } } },
    orderBy: { name: 'asc' },
  })

  // Top-level categories only (for parent selector)
  const topLevel = categories.filter(c => !c.parentId)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Categories</h1>

      {/* Create form */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Add category</h2>
        <form action={createCategory} className="flex gap-2 flex-wrap">
          <input
            name="name"
            placeholder="Name"
            required
            className="px-3 py-1.5 border border-gray-300 rounded text-sm flex-1 min-w-32"
          />
          <input
            name="slug"
            placeholder="slug"
            required
            pattern="[a-z0-9-]+"
            title="Lowercase letters, numbers, and hyphens only"
            className="px-3 py-1.5 border border-gray-300 rounded text-sm flex-1 min-w-32"
          />
          <select
            name="parentId"
            className="px-3 py-1.5 border border-gray-300 rounded text-sm"
          >
            <option value="">No parent</option>
            {topLevel.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
          >
            Add
          </button>
        </form>
      </div>

      {/* Categories table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Name</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Slug</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Parent</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Pages</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map(cat => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900">{cat.name}</td>
                <td className="px-4 py-2 text-gray-500 font-mono text-xs">{cat.slug}</td>
                <td className="px-4 py-2 text-gray-500">{cat.parent?.name ?? '—'}</td>
                <td className="px-4 py-2 text-gray-500">{cat._count.pages}</td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteCategory.bind(null, cat.id)} className="inline">
                    <button
                      type="submit"
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">No categories yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify locally**

```bash
npm run dev
```

Open `http://localhost:3000/admin/categories`. Add a category, verify it appears. Delete it, verify it disappears.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(auth\)/categories/
git commit -m "feat: category CRUD admin page"
```

---

## Task 6: Pages List

**Files:**
- Create: `src/app/admin/(auth)/pages/page.tsx`

- [ ] **Step 1: Create pages list page**

Create `src/app/admin/(auth)/pages/page.tsx`:

```typescript
import { db } from '@/lib/db'
import { deletePage, createPage } from '@/lib/actions/pages'
import Link from 'next/link'

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: 'bg-green-100 text-green-700',
  DRAFT: 'bg-gray-100 text-gray-600',
}

const ACCESS_STYLES: Record<string, string> = {
  PUBLIC: 'bg-blue-100 text-blue-700',
  PRIVATE: 'bg-amber-100 text-amber-700',
}

export default async function PagesPage() {
  const pages = await db.page.findMany({
    include: { category: true, createdBy: true },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Pages</h1>
        <form action={createPage}>
          <input
            name="slug"
            placeholder="new-page-slug"
            required
            pattern="[a-z0-9-]+"
            title="Lowercase letters, numbers, and hyphens only"
            className="px-3 py-1.5 border border-gray-300 rounded-l text-sm"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-r text-sm hover:bg-indigo-700"
          >
            + New page
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Title</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Slug</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Category</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Status</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Access</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pages.map(page => (
              <tr key={page.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900">
                  <Link href={`/admin/pages/${page.id}`} className="hover:text-indigo-600">
                    {page.title}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-500 font-mono text-xs">/{page.slug}</td>
                <td className="px-4 py-2 text-gray-500">{page.category?.name ?? '—'}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[page.status]}`}>
                    {page.status.toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ACCESS_STYLES[page.accessMode]}`}>
                    {page.accessMode.toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-2 text-right flex gap-2 justify-end items-center">
                  <Link
                    href={`/admin/pages/${page.id}`}
                    className="text-indigo-600 hover:text-indigo-800 text-xs"
                  >
                    Edit
                  </Link>
                  <form action={deletePage.bind(null, page.id)} className="inline">
                    <button
                      type="submit"
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">No pages yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify locally**

Open `http://localhost:3000/admin/pages`. The seeded "worthy" page should appear. Create a new page by entering a slug and clicking "+ New page" — it redirects to `/admin/pages/[id]` (404 for now, that's Plan 3).

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(auth\)/pages/
git commit -m "feat: pages list with create and delete"
```

---

## Task 7: Background Management

**Files:**
- Create: `src/app/admin/(auth)/backgrounds/page.tsx`
- Create: `src/components/admin/BackgroundUploader.tsx`

- [ ] **Step 1: Create the uploader client component**

Create `src/components/admin/BackgroundUploader.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { saveBackground } from '@/lib/actions/backgrounds'

interface Category {
  id: string
  name: string
}

interface Props {
  categories: Category[]
}

export function BackgroundUploader({ categories }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  function toggleCategory(id: string) {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id],
    )
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      // 1. Get presigned URL
      const res = await fetch('/api/admin/backgrounds/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Presign failed')
      const { url, key, publicUrl } = await res.json()

      // 2. Upload directly to R2
      const upload = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      if (!upload.ok) throw new Error('Upload to R2 failed')

      // 3. Save metadata via server action
      const isAnimated = file.type === 'image/gif' || file.name.endsWith('.gif')
      await saveBackground(file.name, key, publicUrl, file.type, isAnimated, selectedCategories)

      setFile(null)
      setSelectedCategories([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <h2 className="text-sm font-medium text-gray-700 mb-3">Upload background</h2>
      <div className="space-y-3">
        <input
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-gray-600"
        />
        {categories.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Assign to categories (optional):</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <label key={cat.id} className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                    className="rounded"
                  />
                  {cat.name}
                </label>
              ))}
            </div>
          </div>
        )}
        {error && <p className="text-red-600 text-xs">{error}</p>}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create backgrounds page**

Create `src/app/admin/(auth)/backgrounds/page.tsx`:

```typescript
import { db } from '@/lib/db'
import { deleteBackground } from '@/lib/actions/backgrounds'
import { BackgroundUploader } from '@/components/admin/BackgroundUploader'

export default async function BackgroundsPage() {
  const [backgrounds, categories] = await Promise.all([
    db.background.findMany({
      include: { categories: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.category.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Backgrounds</h1>

      <BackgroundUploader categories={categories} />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {backgrounds.map(bg => {
          const r2Key = new URL(bg.r2Url).pathname.slice(1)
          return (
            <div key={bg.id} className="relative group bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bg.r2Url}
                alt={bg.filename}
                className="w-full aspect-video object-cover"
              />
              <div className="p-2">
                <p className="text-xs text-gray-600 truncate">{bg.filename}</p>
                <p className="text-xs text-gray-400">
                  {bg.categories.map(c => c.category.name).join(', ') || 'No category'}
                </p>
                {bg.isAnimated && (
                  <span className="text-xs bg-purple-100 text-purple-600 px-1 rounded">animated</span>
                )}
              </div>
              <form
                action={deleteBackground.bind(null, bg.id, r2Key)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <button
                  type="submit"
                  className="bg-red-500 text-white rounded p-0.5 text-xs leading-none w-5 h-5 flex items-center justify-center hover:bg-red-600"
                  title="Delete"
                >
                  ×
                </button>
              </form>
            </div>
          )
        })}
        {backgrounds.length === 0 && (
          <p className="col-span-full text-gray-400 text-sm text-center py-8">No backgrounds yet — upload one above</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify locally (requires R2 credentials)**

Add R2 credentials to `.env.local`:
```env
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

Then run `npm run dev` and open `http://localhost:3000/admin/backgrounds`. Upload a test image and verify it appears in the gallery.

If R2 is not configured yet, skip this step and verify the page loads without errors (the gallery will be empty).

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/\(auth\)/backgrounds/ src/components/admin/BackgroundUploader.tsx
git commit -m "feat: background gallery with R2 upload and delete"
```

---

## Task 8: Font Management

**Files:**
- Create: `src/app/admin/(auth)/fonts/page.tsx`
- Create: `src/components/admin/FontUploader.tsx`

- [ ] **Step 1: Create font uploader component**

Create `src/components/admin/FontUploader.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { saveFontUpload } from '@/lib/actions/fonts'

export function FontUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload() {
    if (!file || !name.trim()) return
    setUploading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/fonts/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream' }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Presign failed')
      const { url, publicUrl } = await res.json()

      const upload = await fetch(url, { method: 'PUT', body: file })
      if (!upload.ok) throw new Error('Upload to R2 failed')

      await saveFontUpload(name.trim(), publicUrl)
      setFile(null)
      setName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Font display name"
        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
      />
      <input
        type="file"
        accept=".woff2,.woff"
        onChange={e => setFile(e.target.files?.[0] ?? null)}
        className="text-sm text-gray-600"
      />
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <button
        onClick={handleUpload}
        disabled={!file || !name.trim() || uploading}
        className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : 'Upload font'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create fonts page**

Create `src/app/admin/(auth)/fonts/page.tsx`:

```typescript
import { db } from '@/lib/db'
import { addGoogleFont, deleteFont, setAdobeEmbedCode, addAdobeFont } from '@/lib/actions/fonts'
import { FontUploader } from '@/components/admin/FontUploader'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function FontsPage() {
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user.role === 'ADMIN'

  const [fonts, settings] = await Promise.all([
    db.font.findMany({ orderBy: { name: 'asc' } }),
    db.siteSettings.findUnique({ where: { id: 'singleton' } }),
  ])

  const googleFonts = fonts.filter(f => f.type === 'GOOGLE')
  const uploadedFonts = fonts.filter(f => f.type === 'UPLOADED')
  const adobeFonts = fonts.filter(f => f.type === 'ADOBE')

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Fonts</h1>

      {/* Google Fonts */}
      <section>
        <h2 className="text-lg font-medium text-gray-800 mb-3">Google Fonts</h2>
        <form action={addGoogleFont} className="flex gap-2 mb-4">
          <input
            name="name"
            placeholder="e.g. Playfair Display"
            required
            className="px-3 py-1.5 border border-gray-300 rounded text-sm flex-1"
          />
          <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
            Add
          </button>
        </form>
        <FontList fonts={googleFonts} r2KeyExtractor={() => null} />
      </section>

      {/* Uploaded Fonts */}
      <section>
        <h2 className="text-lg font-medium text-gray-800 mb-3">Uploaded Fonts</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <FontUploader />
        </div>
        <FontList fonts={uploadedFonts} r2KeyExtractor={f => f.r2Url ? new URL(f.r2Url).pathname.slice(1) : null} />
      </section>

      {/* Adobe Fonts — admin only */}
      {isAdmin && (
        <section>
          <h2 className="text-lg font-medium text-gray-800 mb-3">Adobe Fonts</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-xs text-gray-500 mb-2">
              Enter your Adobe Fonts project CSS URL (e.g. <code>https://use.typekit.net/abc.css</code>).
              It will be injected into every public page.
            </p>
            <form action={setAdobeEmbedCode} className="flex gap-2">
              <input
                name="code"
                defaultValue={settings?.adobeEmbedCode ?? ''}
                placeholder="https://use.typekit.net/abc.css"
                className="px-3 py-1.5 border border-gray-300 rounded text-sm flex-1"
              />
              <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
                Save
              </button>
            </form>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-xs text-gray-500 mb-2">Add individual Adobe font names to make them available in the editor picker:</p>
            <form action={addAdobeFont} className="flex gap-2">
              <input
                name="name"
                placeholder="e.g. Proxima Nova"
                required
                className="px-3 py-1.5 border border-gray-300 rounded text-sm flex-1"
              />
              <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
                Add
              </button>
            </form>
          </div>
          <FontList fonts={adobeFonts} r2KeyExtractor={() => null} />
        </section>
      )}
    </div>
  )
}

function FontList({
  fonts,
  r2KeyExtractor,
}: {
  fonts: { id: string; name: string; type: string; googleFamily: string | null; r2Url: string | null }[]
  r2KeyExtractor: (f: { r2Url: string | null }) => string | null
}) {
  if (fonts.length === 0) return <p className="text-sm text-gray-400">None yet.</p>
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-100">
          {fonts.map(f => (
            <tr key={f.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 font-medium text-gray-900">{f.name}</td>
              <td className="px-4 py-2 text-gray-400 text-xs">
                {f.googleFamily ?? f.r2Url ?? ''}
              </td>
              <td className="px-4 py-2 text-right">
                <form action={deleteFont.bind(null, f.id, r2KeyExtractor(f))} className="inline">
                  <button type="submit" className="text-red-500 hover:text-red-700 text-xs">
                    Delete
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Verify locally**

Open `http://localhost:3000/admin/fonts`. Add a Google Font ("Playfair Display"), verify it appears. If admin, verify the Adobe Fonts section is visible.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/\(auth\)/fonts/ src/components/admin/FontUploader.tsx
git commit -m "feat: font management for Google, uploaded, and Adobe fonts"
```

---

## Task 9: User Management

**Files:**
- Create: `src/app/admin/(auth)/users/page.tsx`

- [ ] **Step 1: Create users page**

Create `src/app/admin/(auth)/users/page.tsx`:

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { createUser, deleteUser } from '@/lib/actions/users'

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'ADMIN') redirect('/admin')

  const users = await db.user.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Users</h1>

      {/* Create user form */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Add user</h2>
        <form action={createUser} className="grid grid-cols-2 gap-2">
          <input
            name="name"
            placeholder="Name"
            required
            className="px-3 py-1.5 border border-gray-300 rounded text-sm"
          />
          <input
            name="email"
            type="email"
            placeholder="email@example.com"
            required
            className="px-3 py-1.5 border border-gray-300 rounded text-sm"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            minLength={8}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm"
          />
          <div className="flex gap-2">
            <select name="role" className="px-3 py-1.5 border border-gray-300 rounded text-sm flex-1">
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              type="submit"
              className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
            >
              Add
            </button>
          </div>
        </form>
      </div>

      {/* Users table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Name</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Email</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Role</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Joined</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-2 text-gray-500">{user.email}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    user.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {user.role.toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs">
                  {user.createdAt.toLocaleDateString()}
                </td>
                <td className="px-4 py-2 text-right">
                  {user.id !== session!.user.id && (
                    <form action={deleteUser.bind(null, user.id)} className="inline">
                      <button
                        type="submit"
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Delete
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify locally**

Open `http://localhost:3000/admin/users` (must be logged in as admin). Create a test editor account. Verify it appears. Delete it. Verify your own account has no delete button.

- [ ] **Step 3: Run full test suite**

```bash
npx jest
```

Expected: 11 tests pass (existing tests — Plan 2 adds no new unit tests since all new code is UI/server actions).

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/\(auth\)/users/
git commit -m "feat: user management page (admin only)"
```

---

## Task 10: Production Deploy + Smoke Test

- [ ] **Step 1: Set R2 env vars on Railway (if not already done)**

```bash
railway variables --service affirmations \
  --set "R2_ACCOUNT_ID=your-value" \
  --set "R2_ACCESS_KEY_ID=your-value" \
  --set "R2_SECRET_ACCESS_KEY=your-value" \
  --set "R2_BUCKET_NAME=your-value" \
  --set "R2_PUBLIC_URL=your-value"
```

- [ ] **Step 2: Push and deploy**

```bash
git push origin main
railway up --service affirmations --detach
```

- [ ] **Step 3: Smoke test production**

Verify each URL returns the expected HTTP status:

| URL | Expected |
|---|---|
| `https://affirmations-production-63fd.up.railway.app/admin/login` | 200 |
| `https://affirmations-production-63fd.up.railway.app/admin` | 307 → login (if not logged in) |
| `https://affirmations-production-63fd.up.railway.app/admin/categories` | 307 → login (if not logged in) |

Then log in and verify the dashboard, categories, pages, fonts, and users pages all load.

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "feat: Plan 2 complete — admin dashboard"
git push origin main
```
