'use client'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  console.error('[AdminError]', error.message, error.digest)

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-red-600 mb-2">Something went wrong</h2>
      <p className="text-sm text-gray-600 mb-1">{error.message}</p>
      {error.digest && (
        <p className="text-xs text-gray-400 font-mono mb-4">Error ID: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="px-3 py-1.5 bg-clay-500 text-white rounded text-sm hover:bg-clay-600"
      >
        Try again
      </button>
    </div>
  )
}
