import { db } from '@/lib/db'
import { ensureQuickCategory } from '@/lib/actions/quick'
import { QuickUpload } from '@/components/admin/QuickUpload'
import { isR2Configured } from '@/lib/r2'

export const dynamic = 'force-dynamic'

export default async function QuickPage() {
  const r2Ready = isR2Configured()

  if (!r2Ready) {
    return (
      <div className="max-w-md mx-auto">
        <h1 className="font-display text-3xl font-medium text-ink mb-4">Quick upload</h1>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          Photo storage isn’t configured yet, so uploads are disabled.
        </div>
      </div>
    )
  }

  // Make sure the default "quick" category exists, then load all categories.
  const quickId = await ensureQuickCategory()
  const categories = await db.category.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-display text-3xl font-medium text-ink mb-1">Quick upload</h1>
      <p className="text-sm text-muted mb-6">Snap a photo, add a few words, post it.</p>
      <QuickUpload categories={categories} defaultCategoryId={quickId} />
    </div>
  )
}
