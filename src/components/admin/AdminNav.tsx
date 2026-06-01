'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { Role } from '@prisma/client'

interface Props {
  role: Role
}

export function AdminNav({ role }: Props) {
  const pathname = usePathname()

  const items = [
    { href: '/admin', label: 'Dashboard', exact: true },
    { href: '/admin/pages', label: 'Pages', exact: false },
    { href: '/admin/categories', label: 'Categories', exact: false },
    { href: '/admin/backgrounds', label: 'Backgrounds', exact: false },
    { href: '/admin/fonts', label: 'Fonts', exact: false },
    ...(role === 'ADMIN' ? [{ href: '/admin/users', label: 'Users', exact: false }] : []),
  ]

  return (
    <nav className="w-52 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="px-4 py-4 border-b border-gray-200">
        <span className="text-indigo-600 font-semibold text-sm">Affirmations</span>
      </div>
      <div className="flex-1 py-2">
        {items.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-2 text-sm ${
                active
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
