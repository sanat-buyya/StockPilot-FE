import { X } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import Header from './layout/Header'
import Sidebar from './layout/Sidebar'
import { ErrorBanner } from './ui'

/** App shell: Sidebar (left), Header (top) and Content (the routed page). */
export default function Layout() {
  const { workspace } = useAuth()
  const [drawer, setDrawer] = useState(false)

  return (
    <div className="flex min-h-full">
      {/* Sidebar: fixed column on desktop, slide-over drawer on mobile */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <Sidebar />
      </aside>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">
            <button
              onClick={() => setDrawer(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 rounded p-1 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenu={() => setDrawer(true)} />

        {/* Content */}
        <main className="mx-auto w-full max-w-6xl flex-1 p-3 sm:p-4 lg:p-5">
          {workspace ? (
            <Outlet key={workspace.id} />
          ) : (
            <ErrorBanner message="You are not a member of any workspace yet. Create one to get started." />
          )}
        </main>
      </div>
    </div>
  )
}
