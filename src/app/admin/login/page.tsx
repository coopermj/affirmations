'use client'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: fd.get('email'),
      password: fd.get('password'),
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError('Invalid email or password')
    } else {
      router.refresh()
      const callbackUrl = searchParams.get('callbackUrl') ?? '/admin'
      router.push(callbackUrl)
    }
  }

  const fieldClass =
    'w-full px-3.5 py-2.5 bg-paper/60 border border-line rounded-lg text-sm text-ink placeholder-muted/60 focus:outline-none focus:border-clay-400 focus:ring-4 focus:ring-clay-100 transition'

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{
        background:
          'radial-gradient(125% 125% at 50% 0%, #8a4b38 0%, #5e3550 48%, #2c2236 100%)',
      }}
    >
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="text-center mb-8">
          <div className="text-clay-100/80 text-xs tracking-[0.35em] uppercase mb-3">
            ✦ ── ✦
          </div>
          <h1 className="font-display text-4xl text-[#fdfbf7] italic font-light leading-tight">
            Affirmations
          </h1>
          <p className="text-clay-100/70 text-sm mt-2">A little light, on demand.</p>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl shadow-lift p-7">
          <h2 className="font-display text-lg text-ink mb-5">Sign in</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5 tracking-wide">
                Email
              </label>
              <input name="email" type="email" required className={fieldClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5 tracking-wide">
                Password
              </label>
              <input name="password" type="password" required className={fieldClass} />
            </div>
            {error && (
              <p className="text-clay-600 text-sm bg-clay-50 border border-clay-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-clay-500 text-white rounded-lg text-sm font-medium tracking-wide hover:bg-clay-600 active:bg-clay-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-soft"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
