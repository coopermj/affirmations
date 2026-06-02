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
import { gradientCss } from '@/lib/gradients'
import { textEffectClass } from '@/lib/text-effects'
import Link from 'next/link'
import { EditorToolbar } from './EditorToolbar'
import { PageSettings } from './PageSettings'

interface PageData {
  id: string
  title: string
  slug: string
  content: Record<string, unknown>
  categoryId: string | null
  backgroundMode: 'SPECIFIC' | 'CATEGORY_RANDOM' | 'DOMAIN_RANDOM' | 'GRADIENT'
  backgroundId: string | null
  backgroundGradient: string | null
  textEffect: string
  accessMode: 'PUBLIC' | 'PRIVATE'
  privateToken: string
  status: 'DRAFT' | 'PUBLISHED'
}

interface Props {
  page: PageData
  categories: { id: string; name: string }[]
  backgrounds: { id: string; filename: string; r2Url: string; isTiled: boolean }[]
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

// ProseMirror node attrs use null-prototype objects, which Next.js Server
// Actions reject ("Only plain objects ... can be passed"). Round-tripping
// through JSON normalizes the whole tree to plain objects before it crosses
// the client → server boundary.
function toPlainJSON(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value))
}

export function PageEditor({ page, categories, backgrounds, fonts }: Props) {
  const [settings, setSettings] = useState<Settings>({
    title: page.title,
    slug: page.slug,
    categoryId: page.categoryId,
    backgroundMode: page.backgroundMode,
    backgroundId: page.backgroundId,
    backgroundGradient: page.backgroundGradient,
    textEffect: page.textEffect,
    accessMode: page.accessMode,
    status: page.status,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(true)
  const [saveError, setSaveError] = useState<string | null>(null)
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
        setSaveError(null)
        try {
          await savePage(page.id, {
            ...settingsRef.current,
            content: toPlainJSON(ed.getJSON()),
          })
          setSaved(true)
        } catch (err) {
          setSaveError(err instanceof Error ? err.message : 'Save failed')
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
    setSaveError(null)
    try {
      await savePage(page.id, {
        ...settings,
        content: toPlainJSON(editor.getJSON()),
      })
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const specificBg = settings.backgroundMode === 'SPECIFIC' && settings.backgroundId
    ? backgrounds.find(b => b.id === settings.backgroundId)
    : undefined

  const previewStyle = specificBg
    ? specificBg.isTiled
      ? { backgroundImage: `url("${specificBg.r2Url}")`, backgroundRepeat: 'repeat' as const, backgroundSize: 'auto' as const }
      : { backgroundImage: `url("${specificBg.r2Url}")`, backgroundSize: 'cover' as const, backgroundPosition: 'center' as const }
    : { background: settings.backgroundMode === 'GRADIENT' ? gradientCss(settings.backgroundGradient) : GRADIENT_BG }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link href="/admin/pages" className="text-gray-500 hover:text-gray-700">← Pages</Link>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-700 truncate">{settings.title || settings.slug}</span>
        <a
          href={`/${page.slug}${page.accessMode === 'PRIVATE' ? `?t=${page.privateToken}` : ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto shrink-0 px-2.5 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 text-xs"
        >
          View ↗
        </a>
      </div>

      {/* Two-panel layout: stacked on mobile, side-by-side on desktop */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-start">
        {/* Editor */}
        <div className="flex-1 min-w-0 border border-line rounded-lg overflow-hidden bg-surface">
          {editor && (
            <EditorToolbar
              editor={editor}
              fonts={fonts}
              onPreview={() => setPreview(true)}
            />
          )}
          <EditorContent editor={editor} />
        </div>

        {/* Settings */}
        <div className="w-full lg:w-64 shrink-0 border border-line rounded-lg overflow-hidden bg-surface">
          <PageSettings
            {...settings}
            privateToken={page.privateToken}
            categories={categories}
            backgrounds={backgrounds}
            saving={saving}
            saved={saved}
            saveError={saveError}
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
            className={`affirmation-content ${textEffectClass(settings.textEffect)}`}
            dangerouslySetInnerHTML={{ __html: editor?.getHTML() ?? '' }}
          />
          <button
            onClick={() => setPreview(false)}
            className="absolute top-4 right-4 px-3 py-1.5 text-sm text-white bg-black/40 hover:bg-black/60 rounded"
          >
            Close ✕
          </button>
          {settings.backgroundMode !== 'SPECIFIC' && settings.backgroundMode !== 'GRADIENT' && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs">
              Background is random per visit
            </p>
          )}
        </div>
      )}
    </div>
  )
}
