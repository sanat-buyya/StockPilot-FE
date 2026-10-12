import { Boxes, ClipboardList, LayoutDashboard, LogOut, Menu, Package, Plus, ShoppingCart, Users, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { errorMessage } from '../lib/hooks'
import { Button, ErrorBanner, Field, Input, Modal, Select, useToast } from './ui'
const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/inventory', label: 'Stock history', icon: ClipboardList },
]
export function CreateWorkspaceModal({ onClose }) {
  const { createWorkspace } = useAuth()
  const toast = useToast()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Workspace name is required')
      return
    }
    setBusy(true)
    try {
      await createWorkspace(name.trim())
      toast('success', 'Workspace created')
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="New workspace" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Workspace name" htmlFor="ws-name" error={error}>
          <Input
            id="ws-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            invalid={!!error}
            autoFocus
            maxLength={120}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  )
}
export default function Layout() {
  const { user, workspaces, workspace, isOwner, selectWorkspace, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const items = isOwner ? [...NAV, { to: '/team', label: 'Team', icon: Users }] : NAV
  const sidebar = (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center gap-2 px-1 text-lg font-bold text-brand-700">
        <Boxes className="h-6 w-6" aria-hidden /> StockPilot
      </div>

      <div className="space-y-1.5">
        <label htmlFor="ws-switch" className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Workspace
        </label>
        <Select
          id="ws-switch"
          value={workspace?.id ?? ''}
          onChange={(e) => {
            selectWorkspace(e.target.value)
            setOpen(false)
          }}
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.role})
            </option>
          ))}
        </Select>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 px-1 text-xs font-medium text-brand-600 hover:underline"
        >
          <Plus className="h-3 w-3" aria-hidden /> New workspace
        </button>
      </div>

      <nav className="flex-1 space-y-1" aria-label="Main">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`
            }
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 pt-3">
        <p className="truncate px-1 text-sm font-medium">{user?.name}</p>
        <p className="truncate px-1 text-xs text-slate-500">{user?.email}</p>
        <button
          onClick={logout}
          className="mt-2 flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm text-slate-600 hover:bg-slate-100"
        >
          <LogOut className="h-4 w-4" aria-hidden /> Sign out
        </button>
      </div>
    </div>
  )
  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="rounded p-2 hover:bg-slate-100"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-bold text-brand-700">StockPilot</span>
          <span className="ml-auto truncate text-xs text-slate-500">{workspace?.name}</span>
        </header>

        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          {workspace ? (
            <Outlet key={workspace.id} />
          ) : (
            <ErrorBanner message="You are not a member of any workspace yet. Create one to get started." />
          )}
        </main>
      </div>
      {creating && <CreateWorkspaceModal onClose={() => setCreating(false)} />}
    </div>
  )
}
