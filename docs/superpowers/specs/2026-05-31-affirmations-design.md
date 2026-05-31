# Affirmations App — Design Spec

**Date:** 2026-05-31  
**Status:** Approved

---

## Overview

A web application that displays affirmations and happy sayings as full-screen immersive pages with animated backgrounds. Visitors arrive via NFC tag taps or direct URLs. Editors manage content through a rich WYSIWYG interface. Deployed on Railway.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL on Railway |
| ORM | Prisma |
| Auth | NextAuth.js (credentials provider) |
| Editor | Tiptap |
| File storage | Cloudflare R2 |
| Deployment | Railway |

---

## Page Display

Affirmation pages are full-screen and immersive — the background fills the entire viewport and text floats centered over it. No navigation chrome, no UI elements visible to visitors. Each page tap or URL visit can deliver a different background depending on the page's background mode setting.

---

## Data Model

### Page
- `id`, `slug` (URL-safe, unique), `title` (internal label)
- `content` — Tiptap ProseMirror JSON
- `categoryId` — FK to Category
- `backgroundMode` — `specific | category_random | domain_random`
- `backgroundId` — FK to Background (only used when `backgroundMode = specific`)
- `accessMode` — `public | private`
- `privateToken` — UUID (only used when `accessMode = private`)
- `status` — `draft | published`
- `createdBy` — FK to User
- `createdAt`, `updatedAt`

### Category
- `id`, `name`, `slug`
- `parentId` — optional FK to Category (for super-category grouping)

### Background
- `id`, `filename`, `r2Url`, `mimeType`, `isAnimated`
- `categoryIds` — many-to-many with Category (a background can belong to multiple categories)
- `createdAt`

### Font
- `id`, `name`, `type` — `google | uploaded | adobe`
- `googleFamily` — Google Fonts family name (type = google)
- `r2Url` — R2 path to font file (type = uploaded)
- `adobeEmbedCode` — Adobe Fonts project embed code (type = adobe; site-wide, admin-only)

### User
- `id`, `email`, `name`, `passwordHash`
- `role` — `admin | editor`
- `createdAt`

---

## URL & Routing

### Public Routes
| Route | Behavior |
|---|---|
| `/` | Redirects to `/random` |
| `/random` | Serves a random published page from the entire site |
| `/c/[slug]` | Serves a random published page from that category |
| `/[slug]` | Serves the page directly; returns 404 if private and no valid `?t=` token |

**Private page access:** Private pages require `?t=[uuid]` in the query string. Without the correct token, the server returns 404 (not 403) so the page's existence is not revealed.

**NFC tag pattern:** Tags encode one of the three public URL forms. Each tap can deliver a different background (and different page, if using category/random routing).

### Admin Routes (auth-protected)
| Route | Access |
|---|---|
| `/admin` | Editor + Admin |
| `/admin/pages` | Editor + Admin |
| `/admin/pages/[id]` | Editor + Admin |
| `/admin/backgrounds` | Editor + Admin |
| `/admin/fonts` | Editor + Admin |
| `/admin/categories` | Editor + Admin |
| `/admin/users` | Admin only |

Route protection is enforced in `middleware.ts`. Admin-only routes additionally check `role === 'admin'`.

---

## RBAC

| Capability | Public | Editor | Admin |
|---|---|---|---|
| View public pages | ✓ | ✓ | ✓ |
| View private pages (with token) | ✓ | ✓ | ✓ |
| Create / edit / delete pages | — | ✓ | ✓ |
| Manage backgrounds | — | ✓ | ✓ |
| Manage fonts (Google + uploaded) | — | ✓ | ✓ |
| Manage categories | — | ✓ | ✓ |
| Enable Adobe Fonts | — | — | ✓ |
| Manage users | — | — | ✓ |

No self-registration. Admin creates all editor and admin accounts via `/admin/users`.

---

## Editor

Located at `/admin/pages/[id]`. Two-panel layout:

- **Left panel:** Tiptap editor with toolbar + full-screen preview button
- **Right panel:** Page settings (slug, category, font default, background mode, access mode, private token display)

### Toolbar capabilities
- Bold, italic
- Per-selection font family (from enabled fonts list)
- Per-selection font size
- Per-selection text color
- Text alignment
- Flourishes (decorative inline elements)

### Flourishes
Ornamental elements inserted via the toolbar — decorative dividers (e.g. `✦ ── ✦`), typographic marks (❧ ❦ ✿), and blank spacers. Implemented as custom Tiptap nodes stored in the ProseMirror JSON.

### Content storage
Content is stored as Tiptap ProseMirror JSON in the database. Rendered to HTML at request time on the server.

### Preview mode
Full-screen preview renders the page exactly as visitors will see it, including the selected or random background. Accessible via a "Preview" button in the editor toolbar without publishing.

---

## Background Management (`/admin/backgrounds`)

- Drag-and-drop upload to Cloudflare R2
- Supported formats: JPEG, PNG, GIF, WebP (including animated)
- Each background can be tagged to one or more categories
- Background selection at render time: random backgrounds are selected per-request (not cached), so each NFC tap can deliver a different background

---

## Font Management (`/admin/fonts`)

Three font source types:

**Google Fonts** — editor searches by family name; added to DB; loaded via Google Fonts CSS API at render time.

**Uploaded fonts** — editor uploads `.woff2` / `.woff` files; stored on R2; served directly from the bucket.

**Adobe Fonts** — admin-only setting; admin enters the Adobe Fonts project embed code; stored as a site-wide setting; injected into every page `<head>`.

All enabled fonts appear in the editor's font picker for both page-level defaults and per-selection overrides.

---

## Deployment

- **Railway service:** Next.js app
- **Railway database:** PostgreSQL
- **Cloudflare R2:** Background images + uploaded font files
- Environment variables: `DATABASE_URL`, `NEXTAUTH_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
