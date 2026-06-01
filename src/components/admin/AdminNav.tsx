'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import type { Role } from '@prisma/client'

interface Props {
  role: Role
}

export function AdminNav({ role }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const items = [
    { href: '/admin', label: 'Dashboard', exact: true },
    { href: '/admin/pages', label: 'Pages', exact: false },
    { href: '/admin/categories', label: 'Categories', exact: false },
    { href: '/admin/backgrounds', label: 'Backgrounds', exact: false },
    { href: '/admin/fonts', label: 'Fonts', exact: false },
    ...(role === 'ADMIN' ? [{ href: '/admin/users', label: 'Users', exact: false }] : []),
    { href: '/admin/account', label: 'Account', exact: false },
  ]

  const links = (
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
  )

  const signOutBtn = (
    <button
      onClick={() => signOut({ callbackUrl: '/admin/login' })}
      className="text-xs text-muted hover:text-ink transition-colors"
    >
      Sign out
    </button>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-surface border-b border-line">
        <span className="font-display text-lg italic text-clay-600">Affirmations</span>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-2 -mr-2 text-ink"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute left-0 top-0 bottom-0 w-64 bg-surface shadow-lift flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <span className="font-display text-lg italic text-clay-600">Affirmations</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="p-1 text-muted hover:text-ink"
              >
                ✕
              </button>
            </div>
            {links}
            <div className="p-4 border-t border-line">{signOutBtn}</div>
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <nav className="hidden lg:flex w-56 bg-surface border-r border-line flex-col shrink-0">
        <div className="px-5 py-5 border-b border-line">
          <span className="font-display text-lg italic text-clay-600">Affirmations</span>
          <p className="text-[11px] text-muted tracking-wide mt-0.5">Admin</p>
        </div>
        {links}
        <div className="p-4 border-t border-line">{signOutBtn}</div>
      </nav>
    </>
  )
}
