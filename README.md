# Affirmations

A web app that displays affirmations and happy sayings as full-screen, immersive pages with image or gradient backgrounds. Visitors arrive by tapping an NFC tag with their phone (or via a direct URL); editors manage the content through a WYSIWYG admin dashboard.

**Live:** https://affirmations-production-63fd.up.railway.app

---

## How it works

- **Visitors** tap an NFC tag that points at a URL. The page renders full-screen — the background fills the viewport and the saying floats centered over it. Each tap can deliver a different page and/or background.
- **Editors** sign in to an admin dashboard to write pages in a rich-text editor, organize them into categories, upload backgrounds and fonts, and publish.
- **Admins** additionally manage user accounts and Adobe Fonts.

### URLs

| Route | Behavior |
|---|---|
| `/` | Redirects to `/random` |
| `/random` | A random published, public page from the whole site |
| `/c/[slug]` | A random published, public page from that category |
| `/[slug]` | A specific page. Private pages require `?t=<token>`; without it the server returns 404 (never revealing the page exists) |
| `/admin` | Admin dashboard (auth required) |

NFC tags can encode any of the three public URL forms.

---

## Features

- **Full-screen affirmation pages** with a legibility scrim over imagery and a warm gradient fallback
- **RBAC** — Admin and Editor roles; public/private pages (private gated by an unguessable token)
- **WYSIWYG editor** (Tiptap) — bold/italic/underline, per-selection font family, font size, and color, text alignment, and decorative **flourishes**
- **Auto-save** plus an explicit Save, and a full-screen **Preview** that matches the live page
- **Backgrounds** — upload images (JPEG/PNG/GIF/WebP, including animated) to Cloudflare R2, tag them to categories; choose a specific image, a random image from the category, a random image from the whole site, or a **curated gradient**
- **Fonts** — add Google Fonts by name, upload `.woff2`/`.woff` files, or (admin) wire up an Adobe Fonts project
- **Categories** with one level of nesting
- **Responsive** — visitor pages and the admin dashboard both work from phone to desktop

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS (Fraunces + Hanken Grotesk via `next/font`) |
| Database | PostgreSQL (Railway) |
| ORM | Prisma 7 with the `@prisma/adapter-pg` driver adapter |
| Auth | NextAuth v4 (credentials provider, JWT sessions) |
| Editor | Tiptap 3 |
| File storage | Cloudflare R2 (S3-compatible) |
| Hosting | Railway (auto-deploys from `main`) |

---

## Local development

### Prerequisites
- Node.js 18+
- A PostgreSQL database (the project uses Railway's; for local-only work any Postgres works)
- A Cloudflare R2 bucket (only needed for background/font uploads)

### Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npx prisma migrate deploy    # apply migrations
npx prisma db seed           # seed an admin user + sample data
npm run dev
```

Open http://localhost:3000. The seed creates an admin account (`SEED_ADMIN_EMAIL`, default `admin@example.com`). Set `SEED_ADMIN_PASSWORD` before seeding, or the seed generates a strong random password and prints it once — sign in with that at `/admin/login`.

### Environment variables

```env
DATABASE_URL=postgresql://user:password@host:5432/db
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<openssl rand -base64 32>
R2_ACCOUNT_ID=<cloudflare account id>
R2_ACCESS_KEY_ID=<r2 api token access key>
R2_SECRET_ACCESS_KEY=<r2 api token secret>
R2_BUCKET_NAME=<bucket name>
R2_PUBLIC_URL=https://<public-bucket>.r2.dev
```

The app runs fine without the R2 variables — background and font uploads are simply disabled (the admin shows a clear notice) until they're set.

### Useful scripts

```bash
npm run dev      # dev server
npm run build    # prisma generate + next build
npm start        # production server
npm test         # jest (renderer + background-selection unit tests)
npx jest
```

---

## Cloudflare R2 notes

- The S3 client uses **path-style addressing** (`forcePathStyle: true`). R2's wildcard TLS cert only covers one subdomain level, so the SDK's default virtual-hosted style fails the TLS handshake.
- Browser uploads use **presigned URLs** (browser → R2 directly), so the bucket needs a **CORS policy** allowing `PUT`/`GET` from the app's origin:

```json
[
  {
    "AllowedOrigins": ["https://your-app-domain", "http://localhost:3000"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

- The bucket needs a public access URL (`R2_PUBLIC_URL`) so saved images/fonts can be served.

---

## Deployment

Hosted on Railway with two services: the **Next.js app** and a **PostgreSQL** database. Pushing to `main` triggers a deploy (the app can also be deployed manually with `railway up`).

Set the same environment variables on the Railway app service. On Railway, `DATABASE_URL` uses the internal `postgres.railway.internal` host; for local development use the public proxy URL from `railway variables --service Postgres`.

> Migrations are not run automatically by the build. After changing the schema, apply migrations against the target database (`npx prisma migrate deploy`) before/with the deploy.

---

## Project layout

```
prisma/
  schema.prisma            # data model (User, Page, Category, Background, Font, SiteSettings)
  seed.ts                  # admin user + sample category/page
src/
  app/
    (public)/              # visitor-facing affirmation pages
    admin/                 # login + dashboard (auth route group)
    api/                   # NextAuth, R2 presign, health
  components/              # AffirmationPage, FontLoader, admin UI
  lib/
    db.ts                  # Prisma client (adapter-pg singleton)
    auth.ts                # NextAuth options
    r2.ts                  # R2 client + presign/delete helpers
    backgrounds.ts         # background/gradient resolution
    gradients.ts           # curated gradient presets
    tiptap-renderer.ts     # ProseMirror JSON → HTML (server-side)
    tiptap-extensions.ts   # FontSize + Flourish editor extensions
    actions/               # server actions (pages, categories, backgrounds, fonts, users)
  middleware.ts            # protects /admin/*
docs/superpowers/          # design spec and implementation plans
```

---

## Seed admin account

The seed creates an admin user from `SEED_ADMIN_EMAIL` (default `admin@example.com`) and `SEED_ADMIN_PASSWORD`. If no password is provided, a strong random one is generated and printed once during seeding — record it. No default password is stored in the codebase.
