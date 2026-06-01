'use client'
import { useState } from 'react'
import { changePassword } from '@/lib/actions/account'

export function ChangePasswordForm() {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ type: 'ok' | 'error'; msg: string } | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const current = String(fd.get('current') ?? '')
    const next = String(fd.get('next') ?? '')
    const confirm = String(fd.get('confirm') ?? '')

    if (next !== confirm) {
      setStatus({ type: 'error', msg: 'New passwords do not match' })
      return
    }

    setBusy(true)
    setStatus(null)
    const res = await changePassword(current, next)
    setBusy(false)

    if (res.ok) {
      setStatus({ type: 'ok', msg: 'Password updated.' })
      form.reset()
    } else {
      setStatus({ type: 'error', msg: res.error ?? 'Could not change password' })
    }
  }

  const field =
    'w-full px-3 py-2 border border-line rounded-lg text-sm text-ink bg-paper/40 focus:outline-none focus:border-clay-400 focus:ring-4 focus:ring-clay-100 transition'
  const label = 'block text-xs font-medium text-muted mb-1.5'

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={label}>Current password</label>
        <input name="current" type="password" required autoComplete="current-password" className={field} />
      </div>
      <div>
        <label className={label}>New password</label>
        <input name="next" type="password" required minLength={8} autoComplete="new-password" className={field} />
      </div>
      <div>
        <label className={label}>Confirm new password</label>
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={field} />
      </div>

      {status && (
        <p
          className={`text-sm rounded-lg px-3 py-2 ${
            status.type === 'ok'
              ? 'text-sage-700 bg-sage-100 border border-sage-100'
              : 'text-clay-600 bg-clay-50 border border-clay-100'
          }`}
        >
          {status.msg}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="py-2 px-4 bg-clay-500 text-white rounded-lg text-sm font-medium hover:bg-clay-600 disabled:opacity-50 transition"
      >
        {busy ? 'Updating…' : 'Update password'}
      </button>
    </form>
  )
}
