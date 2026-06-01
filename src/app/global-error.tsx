'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // This runs on the client, but the server-side console.error fires during SSR
  console.error('[GlobalError]', error.message, error.digest)

  return (
    <html>
      <body style={{ fontFamily: 'system-ui', padding: '2rem' }}>
        <h2 style={{ color: '#dc2626' }}>Something went wrong</h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{error.message}</p>
        {error.digest && (
          <p style={{ color: '#9ca3af', fontSize: '0.75rem', fontFamily: 'monospace' }}>
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
