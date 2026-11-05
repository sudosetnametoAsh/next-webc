'use client'

import { usePathname } from 'next/navigation'

const viewportPages = new Set([
  '/admin/dashboard',
  '/admin/clients',
  '/admin/templates',
  '/admin/departments',
])

export default function AdminPageContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isViewportPage = viewportPages.has(pathname.replace(/\/$/, ''))

  return (
    <main className={`flex min-h-0 min-w-0 flex-1 flex-col ${isViewportPage ? 'overflow-hidden' : 'overflow-y-auto'}`}>
      <div className={`mx-auto w-full max-w-[1920px] px-4 py-4 sm:px-6 lg:px-8 ${isViewportPage ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : 'space-y-6 py-6'}`}>
        <div className={isViewportPage ? 'min-h-0 flex-1 overflow-hidden' : ''}>{children}</div>
      </div>
    </main>
  )
}
