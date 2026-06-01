import { db } from '@/lib/db'
import { createCategory, deleteCategory } from '@/lib/actions/categories'

export default async function CategoriesPage() {
  const categories = await db.category.findMany({
    include: { parent: true, _count: { select: { pages: true } } },
    orderBy: { name: 'asc' },
  })

  const topLevel = categories.filter(c => !c.parentId)

  return (
    <div>
      <h1 className="font-display text-3xl font-medium text-ink mb-6">Categories</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Add category</h2>
        <form action={createCategory} className="flex gap-2 flex-wrap">
          <input
            name="name"
            placeholder="Name"
            required
            className="px-3 py-1.5 border border-gray-300 rounded text-sm flex-1 min-w-32"
          />
          <input
            name="slug"
            placeholder="slug"
            required
            pattern="[a-z0-9-]+"
            title="Lowercase letters, numbers, and hyphens only"
            className="px-3 py-1.5 border border-gray-300 rounded text-sm flex-1 min-w-32"
          />
          <select
            name="parentId"
            className="px-3 py-1.5 border border-gray-300 rounded text-sm"
          >
            <option value="">No parent</option>
            {topLevel.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="px-3 py-1.5 bg-clay-500 text-white rounded text-sm hover:bg-clay-600"
          >
            Add
          </button>
        </form>
      </div>

      <div className="bg-surface border border-line rounded-lg overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Name</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Slug</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Parent</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Pages</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map(cat => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900">{cat.name}</td>
                <td className="px-4 py-2 text-gray-500 font-mono text-xs">{cat.slug}</td>
                <td className="px-4 py-2 text-gray-500">{cat.parent?.name ?? '—'}</td>
                <td className="px-4 py-2 text-gray-500">{cat._count.pages}</td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteCategory.bind(null, cat.id)} className="inline">
                    <button type="submit" className="text-red-500 hover:text-red-700 text-xs">
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">No categories yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
