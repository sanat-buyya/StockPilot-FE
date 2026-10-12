import { Boxes, ClipboardList, LayoutDashboard, LogOut, Package, Plus, ShoppingCart, Users } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { errorMessage } from '../../lib/hooks'
import { Button, Field, Input, Modal, Select, useToast } from '../ui'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/inventory', label: 'Stock history', icon: ClipboardList },
]

function CreateWorkspaceModal({ onClose }) {
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

/** Brand, workspace switcher and main navigation. `onNavigate` lets the mobile drawer close itself. */
export default function Sidebar({ onNavigate = () => {} }) {
  const { workspaces, workspace, isOwner, selectWorkspace, logout } = useAuth()
  const [creating, setCreating] = useState(false)
  const items = isOwner ? [...NAV, { to: '/team', label: 'Team', icon: Users }] : NAV

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex h-10 items-center gap-2 px-1 text-lg font-bold text-brand-700">
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
            onNavigate()
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
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`
            }
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 pt-3">
        <button
          onClick={logout}
          className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" aria-hidden /> Sign out
        </button>
      </div>

      {creating && <CreateWorkspaceModal onClose={() => setCreating(false)} />}
    </div>
  )
}
