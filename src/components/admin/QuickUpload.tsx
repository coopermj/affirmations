'use client'
import { useState, useRef } from 'react'
import { quickUpload } from '@/lib/actions/quick'

interface Props {
  categories: { id: string; name: string }[]
  defaultCategoryId: string
}

export function QuickUpload({ categories, defaultCategoryId }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [categoryId, setCategoryId] = useState(defaultCategoryId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [doneSlug, setDoneSlug] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function pickFile(f: File | null) {
    setFile(f)
    setError('')
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return f ? URL.createObjectURL(f) : null
    })
  }

  async function handleUpload() {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/backgrounds/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      })
      if (!res.ok) {
        const msg = await res.json().then(d => d.error).catch(() => null)
        throw new Error(msg ?? `Upload prep failed (${res.status})`)
      }
      const { url, publicUrl } = await res.json()

      const put = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      if (!put.ok) throw new Error('Photo upload failed — try again')

      const result = await quickUpload({
        text,
        categoryId: categoryId || null,
        filename: file.name,
        r2Url: publicUrl,
        mimeType: file.type,
      })
      if (!result.ok) throw new Error(result.error ?? 'Could not save')

      setDoneSlug(result.slug ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setText('')
    setCategoryId(defaultCategoryId)
    setDoneSlug(null)
    setError('')
  }

  // Success screen
  if (doneSlug) {
    return (
      <div className="text-center space-y-5 py-6">
        <div className="text-5xl">✨</div>
        <p className="font-display text-2xl text-ink">Posted!</p>
        <p className="text-sm text-muted">Your photo is live for everyone to see.</p>
        <div className="flex flex-col gap-2">
          <a
            href={`/${doneSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-clay-500 text-white rounded-xl text-base font-medium hover:bg-clay-600 transition"
          >
            View it ↗
          </a>
          <button
            onClick={reset}
            className="w-full py-3 border border-line text-ink rounded-xl text-base font-medium hover:bg-paper transition"
          >
            Add another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Photo picker / preview */}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => pickFile(e.target.files?.[0] ?? null)}
      />
      {previewUrl ? (
        <button
          onClick={() => fileInput.current?.click()}
          className="block w-full rounded-2xl overflow-hidden border border-line"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="preview" className="w-full aspect-square object-cover" />
          <span className="block py-2 text-xs text-muted">Tap photo to change</span>
        </button>
      ) : (
        <button
          onClick={() => fileInput.current?.click()}
          className="w-full aspect-square rounded-2xl border-2 border-dashed border-clay-200 bg-clay-50/50 flex flex-col items-center justify-center gap-3 text-clay-600 active:bg-clay-50 transition"
        >
          <span className="text-5xl">📷</span>
          <span className="text-base font-medium">Take or choose a photo</span>
          <span className="text-xs text-muted">Camera or your photo library</span>
        </button>
      )}

      {/* Caption */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Add a few words… (optional)"
        rows={2}
        className="w-full px-4 py-3 border border-line rounded-xl text-base text-ink bg-surface focus:outline-none focus:border-clay-400 focus:ring-4 focus:ring-clay-100 transition resize-none"
      />

      {/* Category */}
      <div>
        <label className="block text-xs font-medium text-muted mb-1.5">Category</label>
        <select
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
          className="w-full px-4 py-3 border border-line rounded-xl text-base text-ink bg-surface focus:outline-none focus:border-clay-400 focus:ring-4 focus:ring-clay-100 transition"
        >
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm text-clay-600 bg-clay-50 border border-clay-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || busy}
        className="w-full py-4 bg-clay-500 text-white rounded-xl text-lg font-medium hover:bg-clay-600 active:bg-clay-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-soft"
      >
        {busy ? 'Posting…' : 'Post it'}
      </button>
    </div>
  )
}
