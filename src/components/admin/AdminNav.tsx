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
    <nav className="w-56 bg-surface border-r border-line flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-line">
        <span className="font-display text-lg italic text-clay-600">Affirmations</span>
        <p className="text-[11px] text-muted tracking-wide mt-0.5">Admin</p>
      </div>
      <div className="flex-1 py-3 px-2 space-y-0.5">
        {items.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-clay-50 text-clay-700 font-medium'
                  : 'text-muted hover:bg-paper hover:text-ink'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
      <div className="p-4 border-t border-line">
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="text-xs text-muted hover:text-ink transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
