import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ChangePasswordForm } from '@/components/admin/ChangePasswordForm'
import { PasskeyManager } from '@/components/admin/PasskeyManager'
import { listPasskeys } from '@/lib/actions/passkeys'

export default async function AccountPage() {
  const session = await getServerSession(authOptions)
  const passkeys = await listPasskeys()

  return (
    <div className="max-w-md space-y-6">
      <h1 className="font-display text-3xl font-medium text-ink">Account</h1>

      <div className="bg-surface border border-line rounded-lg p-5">
        <p className="text-sm text-muted mb-5">
          Signed in as{' '}
          <span className="text-ink font-medium">{session?.user.email}</span>
          {session?.user.role === 'ADMIN' && (
            <span className="ml-2 inline-flex px-2 py-0.5 rounded text-xs font-medium bg-clay-50 text-clay-700">
              admin
            </span>
          )}
        </p>
        <h2 className="text-sm font-medium text-ink mb-3">Change password</h2>
        <ChangePasswordForm />
      </div>

      <div className="bg-surface border border-line rounded-lg p-5">
        <h2 className="text-sm font-medium text-ink mb-1">Passkeys</h2>
        <p className="text-xs text-muted mb-4">
          Sign in with Face ID, Touch ID, a security key, or your phone — no password needed.
        </p>
        <PasskeyManager passkeys={passkeys} />
      </div>
    </div>
  )
}
