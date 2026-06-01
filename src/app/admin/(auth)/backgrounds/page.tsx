import { db } from '@/lib/db'
import { deleteBackground } from '@/lib/actions/backgrounds'
import { BackgroundUploader } from '@/components/admin/BackgroundUploader'
import { isR2Configured } from '@/lib/r2'

export default async function BackgroundsPage() {
  const [backgrounds, categories] = await Promise.all([
    db.background.findMany({
      include: { categories: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.category.findMany({ orderBy: { name: 'asc' } }),
  ])

  const r2Ready = isR2Configured()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Backgrounds</h1>

      {!r2Ready && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          File storage (Cloudflare R2) is not configured, so uploads are disabled.
          Set the R2 environment variables to enable background uploads.
        </div>
      )}

      {r2Ready && <BackgroundUploader categories={categories} />}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {backgrounds.map(bg => {
          const r2Key = new URL(bg.r2Url).pathname.slice(1)
          return (
            <div key={bg.id} className="relative group bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bg.r2Url}
                alt={bg.filename}
                className="w-full aspect-video object-cover"
              />
              <div className="p-2">
                <p className="text-xs text-gray-600 truncate">{bg.filename}</p>
                <p className="text-xs text-gray-400">
                  {bg.categories.map(c => c.category.name).join(', ') || 'No category'}
                </p>
                {bg.isAnimated && (
                  <span className="text-xs bg-purple-100 text-purple-600 px-1 rounded">animated</span>
                )}
              </div>
              <form
                action={deleteBackground.bind(null, bg.id, r2Key)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <button
                  type="submit"
                  className="bg-red-500 text-white rounded p-0.5 text-xs leading-none w-5 h-5 flex items-center justify-center hover:bg-red-600"
                  title="Delete"
                >
                  ×
                </button>
              </form>
            </div>
          )
        })}
        {backgrounds.length === 0 && (
          <p className="col-span-full text-gray-400 text-sm text-center py-8">
            No backgrounds yet — upload one above
          </p>
        )}
      </div>
    </div>
  )
}
