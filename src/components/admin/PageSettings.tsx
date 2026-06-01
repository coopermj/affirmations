'use client'

import { GRADIENTS, gradientCss } from '@/lib/gradients'

interface SettingsState {
  title: string
  slug: string
  categoryId: string | null
  backgroundMode: 'SPECIFIC' | 'CATEGORY_RANDOM' | 'DOMAIN_RANDOM' | 'GRADIENT'
  backgroundId: string | null
  backgroundGradient: string | null
  accessMode: 'PUBLIC' | 'PRIVATE'
  status: 'DRAFT' | 'PUBLISHED'
}

interface Props extends SettingsState {
  privateToken: string
  categories: { id: string; name: string }[]
  backgrounds: { id: string; filename: string }[]
  saving: boolean
  saved: boolean
  saveError?: string | null
  onChange: (updates: Partial<SettingsState>) => void
  onSave: () => void
}

export function PageSettings({
  title,
  slug,
  categoryId,
  backgroundMode,
  backgroundId,
  backgroundGradient,
  accessMode,
  privateToken,
  status,
  categories,
  backgrounds,
  saving,
  saved,
  saveError,
  onChange,
  onSave,
}: Props) {
  const field = 'w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-clay-400'
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
            className="flex-1 px-2 py-1.5 border border-gray-300 rounded-r text-sm font-mono text-gray-900 focus:outline-none focus:ring-1 focus:ring-clay-400"
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
          <option value="GRADIENT">Gradient</option>
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
        {backgroundMode === 'GRADIENT' && (
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {GRADIENTS.map(g => {
              const active = (backgroundGradient ?? GRADIENTS[0].key) === g.key
              return (
                <button
                  key={g.key}
                  type="button"
                  title={g.label}
                  onClick={() => onChange({ backgroundGradient: g.key })}
                  className={`h-9 rounded-md transition ${
                    active
                      ? 'ring-2 ring-clay-400 ring-offset-1'
                      : 'ring-1 ring-line hover:ring-clay-300'
                  }`}
                  style={{ background: gradientCss(g.key) }}
                />
              )
            })}
          </div>
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
          className="w-full py-1.5 bg-clay-500 text-white rounded text-sm font-medium hover:bg-clay-600 disabled:opacity-50 transition-colors"
        >
          Save
        </button>
        {saveError && (
          <p className="text-xs text-red-600 break-words">{saveError}</p>
        )}
      </div>
    </div>
  )
}
