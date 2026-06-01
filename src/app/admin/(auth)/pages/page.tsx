import { db } from '@/lib/db'
import { deletePage, createPage } from '@/lib/actions/pages'
import Link from 'next/link'

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: 'bg-green-100 text-green-700',
  DRAFT: 'bg-gray-100 text-gray-600',
}

const ACCESS_STYLES: Record<string, string> = {
  PUBLIC: 'bg-blue-100 text-blue-700',
  PRIVATE: 'bg-amber-100 text-amber-700',
}

export default async function PagesPage() {
  const pages = await db.page.findMany({
    include: { category: true },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="font-display text-3xl font-medium text-ink">Pages</h1>
        <form action={createPage} className="flex">
          <input
            name="slug"
            placeholder="new-page-slug"
            required
            pattern="[a-z0-9-]+"
            title="Lowercase letters, numbers, and hyphens only"
            className="px-3 py-1.5 border border-gray-300 rounded-l text-sm"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-clay-500 text-white rounded-r text-sm hover:bg-clay-600"
          >
            + New page
          </button>
        </form>
      </div>

      <div className="bg-surface border border-line rounded-lg overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Title</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Slug</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Category</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Status</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Access</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pages.map(page => (
              <tr key={page.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900">
                  <Link href={`/admin/pages/${page.id}`} className="hover:text-clay-600">
                    {page.title}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-500 font-mono text-xs">
                  <a
                    href={`/${page.slug}${page.accessMode === 'PRIVATE' ? `?t=${page.privateToken}` : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-clay-600 hover:underline"
                  >
                    /{page.slug}
                  </a>
                </td>
                <td className="px-4 py-2 text-gray-500">{page.category?.name ?? '—'}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[page.status]}`}>
                    {page.status.toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ACCESS_STYLES[page.accessMode]}`}>
                    {page.accessMode.toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-2 text-right flex gap-3 justify-end items-center">
                  <a
                    href={`/${page.slug}${page.accessMode === 'PRIVATE' ? `?t=${page.privateToken}` : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 text-xs"
                  >
                    View ↗
                  </a>
                  <Link
                    href={`/admin/pages/${page.id}`}
                    className="text-clay-600 hover:text-clay-700 text-xs"
                  >
                    Edit
                  </Link>
                  <form action={deletePage.bind(null, page.id)} className="inline">
                    <button type="submit" className="text-red-500 hover:text-red-700 text-xs">
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">No pages yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
