import { db } from '@/lib/db'
import Link from 'next/link'

export default async function DashboardPage() {
  const [pages, backgrounds, fonts, categories, users] = await Promise.all([
    db.page.count(),
    db.background.count(),
    db.font.count(),
    db.category.count(),
    db.user.count(),
  ])

  const stats = [
    { label: 'Pages', count: pages, href: '/admin/pages' },
    { label: 'Backgrounds', count: backgrounds, href: '/admin/backgrounds' },
    { label: 'Fonts', count: fonts, href: '/admin/fonts' },
    { label: 'Categories', count: categories, href: '/admin/categories' },
    { label: 'Users', count: users, href: '/admin/users' },
  ]

  return (
    <div>
      <h1 className="font-display text-3xl font-medium text-ink mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map(s => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-clay-300 hover:shadow-sm transition-all"
          >
            <div className="text-3xl font-bold text-clay-600">{s.count}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
