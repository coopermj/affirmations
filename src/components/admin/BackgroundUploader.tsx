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
      const res = await fetch('/api/admin/backgrounds/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      })
      if (!res.ok) {
        const msg = await res.json().then(d => d.error).catch(() => null)
        throw new Error(msg ?? `Presign failed (${res.status})`)
      }
      const { url, key, publicUrl } = await res.json()

      const upload = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      if (!upload.ok) throw new Error('Upload to R2 failed')

      const isAnimated = file.type === 'image/gif'
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
            <div className="flex flex-wrap gap-3">
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
