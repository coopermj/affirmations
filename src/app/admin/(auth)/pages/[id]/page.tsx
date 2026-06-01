import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function PageEditorPage({
  params,
}: {
  params: { id: string }
}) {
  const page = await db.page.findUnique({
    where: { id: params.id },
    include: { category: true },
  })

  if (!page) {
    console.error(`[admin/pages/${params.id}] Page not found`)
    notFound()
  }

  console.log(`[admin/pages/${params.id}] Loaded page: ${page.slug}`)

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/pages" className="text-sm text-gray-500 hover:text-gray-700">
          ← Pages
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-medium">{page.title}</span>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-amber-800 font-medium">Editor coming in Plan 3</p>
        <p className="text-xs text-amber-600 mt-1">
          The Tiptap WYSIWYG editor is the next milestone. For now you can see the page metadata below.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {[
          ['ID', page.id],
          ['Slug', `/${page.slug}`],
          ['Title', page.title],
          ['Status', page.status.toLowerCase()],
          ['Access', page.accessMode.toLowerCase()],
          ['Category', page.category?.name ?? '—'],
          ['Background mode', page.backgroundMode.toLowerCase()],
          ['Private token', page.accessMode === 'PRIVATE' ? page.privateToken : '—'],
          ['Created', page.createdAt.toLocaleString()],
          ['Updated', page.updatedAt.toLocaleString()],
        ].map(([label, value]) => (
          <div key={label} className="flex px-4 py-2.5 text-sm">
            <span className="w-40 text-gray-500 shrink-0">{label}</span>
            <span className="text-gray-900 font-mono text-xs break-all">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <p className="text-xs text-gray-500 mb-1">ProseMirror JSON content:</p>
        <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-auto max-h-48">
          {JSON.stringify(page.content, null, 2)}
        </pre>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href={`/${page.slug}${page.accessMode === 'PRIVATE' ? `?t=${page.privateToken}` : ''}`}
          target="_blank"
          className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
        >
          View page ↗
        </Link>
        <Link
          href="/admin/pages"
          className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
        >
          Back to pages
        </Link>
      </div>
    </div>
  )
}
