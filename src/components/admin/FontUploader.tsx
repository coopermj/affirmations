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
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
        }),
      })
      if (!res.ok) {
        const msg = await res.json().then(d => d.error).catch(() => null)
        throw new Error(msg ?? `Presign failed (${res.status})`)
      }
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
        className="px-3 py-1.5 bg-clay-500 text-white rounded text-sm hover:bg-clay-600 disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : 'Upload font'}
      </button>
    </div>
  )
}
