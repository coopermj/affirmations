# Affirmations App — Plan 3: Page Editor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the page editor stub with a working two-panel Tiptap WYSIWYG editor — left panel for rich text content, right panel for page settings — with auto-save and full-screen preview.

**Architecture:** The server component at `/admin/pages/[id]` fetches the page + related data (categories, backgrounds, fonts) and passes them to a `PageEditor` client component. The client component manages editor state with `useEditor` from `@tiptap/react`, auto-saves content and settings after a 1.5s debounce via the `savePage` server action, and renders a full-screen preview overlay client-side.

**Tech Stack:** `@tiptap/react` 3.x, `@tiptap/extension-text-align`, `@tiptap/extension-underline`, custom FontSize + Flourish extensions, Next.js Server Actions

**This is Plan 3 of 3.** Completes the app.

---

## File Map

```
src/
  app/
    admin/
      (auth)/
        pages/
          [id]/
            page.tsx          # REPLACE stub — server component, fetches page+categories+backgrounds+fonts
  
  components/
    admin/
      PageEditor.tsx          # Main client component: layout, editor state, auto-save, preview overlay
      EditorToolbar.tsx       # Toolbar: bold/italic/underline/color/font/size/align/flourish
      PageSettings.tsx        # Right panel: title/slug/category/background/access/status/save
  
  lib/
    tiptap-extensions.ts      # FontSize extension + Flourish node + TypeScript command declarations
    actions/
      pages.ts                # ADD savePage(id, data) to existing file
```

---

## Task 1: Install Packages + Add savePage Action

**Files:**
- Modify: `package.json`
- Modify: `src/lib/actions/pages.ts`

- [ ] **Step 1: Install Tiptap React and missing extensions**

```bash
npm install @tiptap/react @tiptap/extension-text-align @tiptap/extension-underline
```

- [ ] **Step 2: Add `savePage` to `src/lib/actions/pages.ts`**

Open `src/lib/actions/pages.ts` and append this export after `createPage`:

```typescript
export async function savePage(
  id: string,
  data: {
    title: string
    slug: string
    content: Record<string, unknown>
    categoryId: string | null
    backgroundMode: 'SPECIFIC' | 'CATEGORY_RANDOM' | 'DOMAIN_RANDOM'
    backgroundId: string | null
    accessMode: 'PUBLIC' | 'PRIVATE'
    status: 'DRAFT' | 'PUBLISHED'
  },
) {
  await requireEditor()
  await db.page.update({
    where: { id },
    data: {
      title: data.title,
      slug: data.slug,
      content: data.content,
      categoryId: data.categoryId,
      backgroundMode: data.backgroundMode,
      backgroundId: data.backgroundId,
      accessMode: data.accessMode,
      status: data.status,
    },
  })
  revalidatePath(`/admin/pages/${id}`)
  revalidatePath(`/${data.slug}`)
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/actions/pages.ts
git commit -m "feat: install tiptap/react, add savePage action"
```

---

## Task 2: Tiptap Extensions

**Files:**
- Create: `src/lib/tiptap-extensions.ts`

- [ ] **Step 1: Create the extensions file**

Create `src/lib/tiptap-extensions.ts`:

```typescript
import { Extension, Node, mergeAttributes } from '@tiptap/core'

// Augment Tiptap's command types so TypeScript knows about our custom commands
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType
      unsetFontSize: () => ReturnType
    }
    flourish: {
      insertFlourish: (symbol: string) => ReturnType
    }
  }
}

export const FontSize = Extension.create({
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
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain()
            .setMark('textStyle', { fontSize: null })
            .removeEmptyTextStyle()
            .run(),
    }
  },
})

export const Flourish = Node.create({
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
  addCommands() {
    return {
      insertFlourish:
        (symbol: string) =>
        ({ chain }) =>
          chain().insertContent({ type: 'flourish', attrs: { symbol } }).run(),
    }
  },
})
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/tiptap-extensions.ts
git commit -m "feat: tiptap FontSize and Flourish extensions"
```

---

## Task 3: EditorToolbar Component

**Files:**
- Create: `src/components/admin/EditorToolbar.tsx`

- [ ] **Step 1: Create the toolbar**

Create `src/components/admin/EditorToolbar.tsx`:

```typescript
'use client'
import { useState } from 'react'
import type { Editor } from '@tiptap/react'

const FLOURISH_SYMBOLS = [
  '✦ ── ✦',
  '❧',
  '❦',
  '✿',
  '— — —',
  '· · ·',
]

const FONT_SIZES = ['12', '14', '16', '18', '24', '32', '48', '64', '80']

interface Props {
  editor: Editor
  fonts: { id: string; name: string }[]
  onPreview: () => void
}

export function EditorToolbar({ editor, fonts, onPreview }: Props) {
  const [showFlourish, setShowFlourish] = useState(false)

  const btn = (active: boolean) =>
    `px-2 py-1 rounded text-sm transition-colors ${
      active ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-gray-200'
    }`

  return (
    <div className="flex items-center gap-0.5 flex-wrap px-2 py-1.5 border-b border-gray-200 bg-gray-50 text-sm">
      {/* Bold */}
      <button
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
        className={btn(editor.isActive('bold')) + ' font-bold'}
      >B</button>

      {/* Italic */}
      <button
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
        className={btn(editor.isActive('italic')) + ' italic'}
      >I</button>

      {/* Underline */}
      <button
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleUnderline().run() }}
        className={btn(editor.isActive('underline')) + ' underline'}
      >U</button>

      <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />

      {/* Color picker */}
      <label className={btn(false) + ' flex items-center gap-1 cursor-pointer'} title="Text color">
        <span className="font-bold text-xs">A</span>
        <input
          type="color"
          className="w-4 h-3 cursor-pointer rounded border-0 p-0"
          onInput={e =>
            editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()
          }
        />
      </label>

      <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />

      {/* Font family */}
      <select
        className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-700 max-w-32"
        onChange={e => {
          if (e.target.value) {
            editor.chain().focus().setFontFamily(e.target.value).run()
          } else {
            editor.chain().focus().unsetFontFamily().run()
          }
          e.target.value = ''
        }}
        defaultValue=""
      >
        <option value="">Font…</option>
        {fonts.map(f => (
          <option key={f.id} value={f.name}>{f.name}</option>
        ))}
      </select>

      {/* Font size */}
      <select
        className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-700 w-16"
        onChange={e => {
          if (e.target.value) {
            editor.chain().focus().setFontSize(e.target.value).run()
          }
          e.target.value = ''
        }}
        defaultValue=""
      >
        <option value="">Size…</option>
        {FONT_SIZES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />

      {/* Alignment */}
      <button
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run() }}
        className={btn(editor.isActive({ textAlign: 'left' }))}
        title="Align left"
      >⫶</button>
      <button
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run() }}
        className={btn(editor.isActive({ textAlign: 'center' }))}
        title="Center"
      >≡</button>
      <button
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run() }}
        className={btn(editor.isActive({ textAlign: 'right' }))}
        title="Align right"
      >⫷</button>

      <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />

      {/* Flourish */}
      <div className="relative">
        <button
          onMouseDown={e => { e.preventDefault(); setShowFlourish(v => !v) }}
          className={btn(showFlourish) + ' text-indigo-600 text-xs'}
        >
          ✦ Flourish
        </button>
        {showFlourish && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-max">
            {FLOURISH_SYMBOLS.map(sym => (
              <button
                key={sym}
                onMouseDown={e => {
                  e.preventDefault()
                  editor.chain().focus().insertFlourish(sym).run()
                  setShowFlourish(false)
                }}
                className="block w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50"
              >
                {sym}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Preview */}
      <button
        onMouseDown={e => { e.preventDefault(); onPreview() }}
        className="px-2 py-1 rounded text-xs border border-gray-300 text-gray-600 hover:bg-gray-100 ml-1"
      >
        Preview ↗
      </button>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/EditorToolbar.tsx
git commit -m "feat: editor toolbar with formatting, font, alignment, and flourish controls"
```

---

## Task 4: PageSettings Component

**Files:**
- Create: `src/components/admin/PageSettings.tsx`

- [ ] **Step 1: Create the settings panel**

Create `src/components/admin/PageSettings.tsx`:

```typescript
'use client'

interface SettingsState {
  title: string
  slug: string
  categoryId: string | null
  backgroundMode: 'SPECIFIC' | 'CATEGORY_RANDOM' | 'DOMAIN_RANDOM'
  backgroundId: string | null
  accessMode: 'PUBLIC' | 'PRIVATE'
  status: 'DRAFT' | 'PUBLISHED'
}

interface Props extends SettingsState {
  privateToken: string
  categories: { id: string; name: string }[]
  backgrounds: { id: string; filename: string }[]
  saving: boolean
  saved: boolean
  onChange: (updates: Partial<SettingsState>) => void
  onSave: () => void
}

export function PageSettings({
  title,
  slug,
  categoryId,
  backgroundMode,
  backgroundId,
  accessMode,
  privateToken,
  status,
  categories,
  backgrounds,
  saving,
  saved,
  onChange,
  onSave,
}: Props) {
  const field = 'w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-400'
  const label = 'block text-xs font-medium text-gray-500 mb-1'

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">
      {/* Title */}
      <div>
        <label className={label}>Title</label>
        <input
          value={title}
          onChange={e => onChange({ title: e.target.value })}
          className={field}
        />
      </div>

      {/* Slug */}
      <div>
        <label className={label}>Slug</label>
        <div className="flex items-center">
          <span className="px-2 py-1.5 bg-gray-50 border border-r-0 border-gray-300 rounded-l text-xs text-gray-400">/</span>
          <input
            value={slug}
            onChange={e => onChange({ slug: e.target.value })}
            className="flex-1 px-2 py-1.5 border border-gray-300 rounded-r text-sm font-mono text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className={label}>Category</label>
        <select
          value={categoryId ?? ''}
          onChange={e => onChange({ categoryId: e.target.value || null })}
          className={field}
        >
          <option value="">None</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Background */}
      <div>
        <label className={label}>Background</label>
        <select
          value={backgroundMode}
          onChange={e => onChange({ backgroundMode: e.target.value as SettingsState['backgroundMode'] })}
          className={field}
        >
          <option value="DOMAIN_RANDOM">Random from site</option>
          <option value="CATEGORY_RANDOM">Random from category</option>
          <option value="SPECIFIC">Specific image</option>
        </select>
        {backgroundMode === 'SPECIFIC' && (
          <select
            value={backgroundId ?? ''}
            onChange={e => onChange({ backgroundId: e.target.value || null })}
            className={field + ' mt-1'}
          >
            <option value="">Select background…</option>
            {backgrounds.map(b => (
              <option key={b.id} value={b.id}>{b.filename}</option>
            ))}
          </select>
        )}
      </div>

      {/* Access */}
      <div>
        <label className={label}>Access</label>
        <select
          value={accessMode}
          onChange={e => onChange({ accessMode: e.target.value as SettingsState['accessMode'] })}
          className={field}
        >
          <option value="PUBLIC">Public</option>
          <option value="PRIVATE">Private (token URL)</option>
        </select>
        {accessMode === 'PRIVATE' && (
          <div className="mt-1.5 p-2 bg-gray-50 border border-gray-200 rounded">
            <p className="text-xs text-gray-400 mb-0.5">Token URL:</p>
            <code className="text-xs text-gray-600 break-all">/{slug}?t={privateToken}</code>
          </div>
        )}
      </div>

      {/* Bottom: status + save */}
      <div className="mt-auto pt-4 border-t border-gray-200 space-y-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() =>
              onChange({ status: status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' })
            }
            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
              status === 'PUBLISHED'
                ? 'border-green-400 text-green-700 bg-green-50 hover:bg-green-100'
                : 'border-gray-300 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {status === 'PUBLISHED' ? '● Published' : '○ Draft'}
          </button>
          <span className="text-xs text-gray-400">
            {saving ? 'Saving…' : saved ? '✓ Saved' : '· Unsaved'}
          </span>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full py-1.5 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/PageSettings.tsx
git commit -m "feat: page settings panel component"
```

---

## Task 5: PageEditor Component

**Files:**
- Create: `src/components/admin/PageEditor.tsx`

- [ ] **Step 1: Create the main editor component**

Create `src/components/admin/PageEditor.tsx`:

```typescript
'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import { useState, useRef, useEffect } from 'react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { FontSize, Flourish } from '@/lib/tiptap-extensions'
import { savePage } from '@/lib/actions/pages'
import Link from 'next/link'
import { EditorToolbar } from './EditorToolbar'
import { PageSettings } from './PageSettings'

interface PageData {
  id: string
  title: string
  slug: string
  content: Record<string, unknown>
  categoryId: string | null
  backgroundMode: 'SPECIFIC' | 'CATEGORY_RANDOM' | 'DOMAIN_RANDOM'
  backgroundId: string | null
  accessMode: 'PUBLIC' | 'PRIVATE'
  privateToken: string
  status: 'DRAFT' | 'PUBLISHED'
}

interface Props {
  page: PageData
  categories: { id: string; name: string }[]
  backgrounds: { id: string; filename: string; r2Url: string }[]
  fonts: { id: string; name: string; type: string }[]
}

type Settings = Omit<PageData, 'id' | 'content' | 'privateToken'>

const EXTENSIONS = [
  StarterKit,
  TextStyle,
  Color,
  FontFamily,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Underline,
  FontSize,
  Flourish,
]

const GRADIENT_BG = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'

export function PageEditor({ page, categories, backgrounds, fonts }: Props) {
  const [settings, setSettings] = useState<Settings>({
    title: page.title,
    slug: page.slug,
    categoryId: page.categoryId,
    backgroundMode: page.backgroundMode,
    backgroundId: page.backgroundId,
    accessMode: page.accessMode,
    status: page.status,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(true)
  const [preview, setPreview] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout>()

  // Keep a ref to latest settings so the auto-save timer always has fresh values
  const settingsRef = useRef(settings)
  useEffect(() => { settingsRef.current = settings }, [settings])

  const editor = useEditor({
    extensions: EXTENSIONS,
    content: page.content,
    editorProps: {
      attributes: { class: 'focus:outline-none min-h-96 px-6 py-4 text-gray-900' },
    },
    onUpdate: ({ editor: ed }) => {
      setSaved(false)
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        setSaving(true)
        try {
          await savePage(page.id, {
            ...settingsRef.current,
            content: ed.getJSON() as Record<string, unknown>,
          })
          setSaved(true)
        } finally {
          setSaving(false)
        }
      }, 1500)
    },
  })

  function handleSettingsChange(updates: Partial<Settings>) {
    setSettings(prev => ({ ...prev, ...updates }))
    setSaved(false)
  }

  async function handleSave() {
    if (!editor) return
    clearTimeout(saveTimer.current)
    setSaving(true)
    try {
      await savePage(page.id, {
        ...settings,
        content: editor.getJSON() as Record<string, unknown>,
      })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const specificBg = settings.backgroundMode === 'SPECIFIC' && settings.backgroundId
    ? backgrounds.find(b => b.id === settings.backgroundId)?.r2Url
    : undefined

  const previewStyle = specificBg
    ? { backgroundImage: `url("${specificBg}")`, backgroundSize: 'cover' as const, backgroundPosition: 'center' as const }
    : { background: GRADIENT_BG }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link href="/admin/pages" className="text-gray-500 hover:text-gray-700">← Pages</Link>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-700 truncate">{settings.title || settings.slug}</span>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-4 items-start">
        {/* Left: editor */}
        <div className="flex-1 min-w-0 border border-gray-200 rounded-lg overflow-hidden bg-white">
          {editor && (
            <EditorToolbar
              editor={editor}
              fonts={fonts}
              onPreview={() => setPreview(true)}
            />
          )}
          <EditorContent editor={editor} />
        </div>

        {/* Right: settings */}
        <div className="w-64 shrink-0 border border-gray-200 rounded-lg overflow-hidden bg-white">
          <PageSettings
            {...settings}
            privateToken={page.privateToken}
            categories={categories}
            backgrounds={backgrounds}
            saving={saving}
            saved={saved}
            onChange={handleSettingsChange}
            onSave={handleSave}
          />
        </div>
      </div>

      {/* Preview overlay */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          style={previewStyle}
        >
          <div
            className="affirmation-content"
            dangerouslySetInnerHTML={{ __html: editor?.getHTML() ?? '' }}
          />
          <button
            onClick={() => setPreview(false)}
            className="absolute top-4 right-4 px-3 py-1.5 text-sm text-white bg-black/40 hover:bg-black/60 rounded"
          >
            Close ✕
          </button>
          {!specificBg && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs">
              Background is random per visit
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see `editor.getJSON()` type errors, cast as `editor.getJSON() as Record<string, unknown>`.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/PageEditor.tsx
git commit -m "feat: PageEditor client component with auto-save and preview overlay"
```

---

## Task 6: Replace Page Stub

**Files:**
- Modify: `src/app/admin/(auth)/pages/[id]/page.tsx`

- [ ] **Step 1: Replace stub with server component that fetches data**

Replace entire contents of `src/app/admin/(auth)/pages/[id]/page.tsx`:

```typescript
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { PageEditor } from '@/components/admin/PageEditor'

export default async function PageEditorPage({
  params,
}: {
  params: { id: string }
}) {
  const [page, categories, backgrounds, fonts] = await Promise.all([
    db.page.findUnique({
      where: { id: params.id },
    }),
    db.category.findMany({ orderBy: { name: 'asc' } }),
    db.background.findMany({ orderBy: { createdAt: 'desc' } }),
    db.font.findMany({ orderBy: { name: 'asc' } }),
  ])

  if (!page) {
    console.error(`[admin/pages/${params.id}] Page not found`)
    notFound()
  }

  return (
    <PageEditor
      page={{
        id: page.id,
        title: page.title,
        slug: page.slug,
        content: page.content as Record<string, unknown>,
        categoryId: page.categoryId,
        backgroundMode: page.backgroundMode,
        backgroundId: page.backgroundId,
        accessMode: page.accessMode,
        privateToken: page.privateToken,
        status: page.status,
      }}
      categories={categories}
      backgrounds={backgrounds}
      fonts={fonts}
    />
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: clean build, `/admin/pages/[id]` listed as `ƒ` (dynamic).

- [ ] **Step 3: Smoke test locally**

```bash
npm run dev
```

1. Open `http://localhost:3000/admin/login`, sign in.
2. Navigate to `http://localhost:3000/admin/pages` — click "Edit" on "worthy".
3. Verify the two-panel editor loads with toolbar on the left, settings on the right.
4. Type some text → verify "Saving…" appears then "✓ Saved".
5. Apply bold, change font size → verify formatting is applied.
6. Click "Preview ↗" → full-screen overlay shows rendered content.
7. Close preview → back to editor.
8. Toggle status to "Published" → click "Save" → verify.
9. Visit `http://localhost:3000/worthy` → verify rendered content matches.

- [ ] **Step 4: Run tests**

```bash
npx jest
```

Expected: 11 tests pass.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(auth)/pages/[id]/page.tsx"
git commit -m "feat: Plan 3 complete — Tiptap page editor with settings and preview"
```

---

## What's Next

Deploy to Railway:
```bash
git push origin main
railway up --service affirmations --detach
```

The app is now feature-complete for the core workflow:
- Visitors tap NFC tags → full-screen affirmation pages
- Editors log in → create pages, write content with WYSIWYG editor, manage backgrounds/fonts/categories
- Admins → also manage users and Adobe Fonts

Remaining enhancements for future consideration:
- Multiple pages per site with more sophisticated random selection
- Background preview in the editor settings panel  
- Slug collision detection with user feedback
- Drag-to-reorder backgrounds/categories
