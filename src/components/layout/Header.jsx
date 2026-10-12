import { Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { initials, pageTitle } from '../../lib/pageTitle'

export function Avatar({ name, className = 'h-8 w-8 text-xs' }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-600 font-semibold text-white ${className}`}
    >
      {initials(name)}
    </span>
  )
}

/** Top bar: active page name on the left, profile (avatar + name) on the right. Sign out lives in the sidebar. */
export default function Header({ onMenu }) {
  const { pathname } = useLocation()
  const { user, role } = useAuth()
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <button onClick={onMenu} aria-label="Open menu" className="rounded p-2 hover:bg-slate-100 lg:hidden">
        <Menu className="h-5 w-5" />
      </button>
      <h2 className="truncate text-base font-semibold text-slate-800">{pageTitle(pathname)}</h2>

      <div className="ml-auto flex items-center gap-2" title={user?.email}>
        <Avatar name={user?.name} />
        <div className="hidden min-w-0 text-left sm:block">
          <p className="max-w-40 truncate text-sm font-medium leading-tight">{user?.name}</p>
          <p className="text-xs capitalize leading-tight text-slate-500">{role}</p>
        </div>
      </div>
    </header>
  )
}
