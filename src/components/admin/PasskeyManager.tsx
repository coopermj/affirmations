'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser'
import { renamePasskey, deletePasskey, type PasskeySummary } from '@/lib/actions/passkeys'

interface Props {
  passkeys: PasskeySummary[]
}

function formatDate(iso: string | null): string {
  if (!iso) return 'never'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function PasskeyManager({ passkeys }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ type: 'ok' | 'error'; msg: string } | null>(null)
  const supported = typeof window !== 'undefined' && browserSupportsWebAuthn()

  async function addPasskey() {
    setBusy(true)
    setStatus(null)
    try {
      const optRes = await fetch('/api/auth/passkey/register/options', { method: 'POST' })
      if (!optRes.ok) {
        const msg = await optRes.json().then(d => d.error).catch(() => null)
        throw new Error(msg ?? 'Could not start registration')
      }
      const optionsJSON = await optRes.json()

      const attResp = await startRegistration({ optionsJSON })

      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: attResp }),
      })
      if (!verifyRes.ok) {
        const msg = await verifyRes.json().then(d => d.error).catch(() => null)
        throw new Error(msg ?? 'Could not save passkey')
      }
      const { name } = await verifyRes.json()
      setStatus({ type: 'ok', msg: `Passkey "${name}" added.` })
      router.refresh()
    } catch (e) {
      // The user cancelling the OS prompt throws — show a gentle message.
      const msg =
        e instanceof Error && /abort|cancel|NotAllowed/i.test(e.message)
          ? 'Passkey setup was cancelled.'
          : e instanceof Error
            ? e.message
            : 'Could not add passkey'
      setStatus({ type: 'error', msg })
    } finally {
      setBusy(false)
    }
  }

  async function rename(id: string, current: string) {
    const next = window.prompt('Rename passkey', current)
    if (next === null) return
    const res = await renamePasskey(id, next)
    if (res.ok) router.refresh()
    else setStatus({ type: 'error', msg: res.error ?? 'Could not rename' })
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete passkey "${name}"? You can't sign in with it afterward.`)) return
    const res = await deletePasskey(id)
    if (res.ok) {
      setStatus({ type: 'ok', msg: 'Passkey deleted.' })
      router.refresh()
    } else {
      setStatus({ type: 'error', msg: res.error ?? 'Could not delete' })
    }
  }

  return (
    <div>
      {passkeys.length > 0 ? (
        <ul className="divide-y divide-line border border-line rounded-lg mb-4">
          {passkeys.map(pk => (
            <li key={pk.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink truncate">{pk.name}</p>
                <p className="text-xs text-muted">
                  Added {formatDate(pk.createdAt)} · Last used {formatDate(pk.lastUsedAt)}
                </p>
              </div>
              <button
                onClick={() => rename(pk.id, pk.name)}
                className="text-xs text-muted hover:text-ink px-2 py-1"
              >
                Rename
              </button>
              <button
                onClick={() => remove(pk.id, pk.name)}
                className="text-xs text-clay-600 hover:text-clay-700 px-2 py-1"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted mb-4">
          No passkeys yet. Add one to sign in without a password.
        </p>
      )}

      {supported ? (
        <button
          onClick={addPasskey}
          disabled={busy}
          className="py-2 px-4 bg-clay-500 text-white rounded-lg text-sm font-medium hover:bg-clay-600 disabled:opacity-50 transition"
        >
          {busy ? 'Waiting for device…' : 'Add a passkey'}
        </button>
      ) : (
        <p className="text-sm text-muted">This browser doesn’t support passkeys.</p>
      )}

      {status && (
        <p
          className={`mt-3 text-sm rounded-lg px-3 py-2 ${
            status.type === 'ok'
              ? 'text-sage-700 bg-sage-100 border border-sage-100'
              : 'text-clay-600 bg-clay-50 border border-clay-100'
          }`}
        >
          {status.msg}
        </p>
      )}
    </div>
  )
}
