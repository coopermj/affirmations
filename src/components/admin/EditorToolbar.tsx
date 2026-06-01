'use client'
import { useState } from 'react'
import type { Editor } from '@tiptap/react'
// Import extension types to pull in their `declare module '@tiptap/core'` augmentations
import '@tiptap/extension-bold'
import '@tiptap/extension-italic'
import '@tiptap/extension-underline'
import '@tiptap/extension-text-style'
import '@tiptap/extension-color'
import '@tiptap/extension-font-family'
import '@tiptap/extension-text-align'
import '@/lib/tiptap-extensions'

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
      active ? 'bg-clay-100 text-clay-700' : 'text-gray-700 hover:bg-gray-200'
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
          className={btn(showFlourish) + ' text-clay-600 text-xs'}
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
