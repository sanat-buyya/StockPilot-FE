import { Trash2, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError, del, get, patch, post } from '../api/client'
import type { Member, Role } from '../api/types'
import { useAuth, useWs } from '../auth/AuthContext'
import { Button, Card, ConfirmDialog, ErrorBanner, Field, Input, Modal, PageHeader, Select, Spinner, useToast } from '../components/ui'
import { formatDate } from '../lib/format'
import { useAsync } from '../lib/hooks'

function AddMemberModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const ws = useWs()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('staff')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email'); return }
    setBusy(true)
    try {
      await post(`${ws}/members`, { email: email.trim(), role })
      toast('success', 'Member added')
      onAdded()
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Something went wrong') } finally { setBusy(false) }
  }

  return (
    <Modal title="Add team member" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-sm text-slate-600">The person must already have a StockPilot account. Ask them to register first, then add them by email.</p>
        <Field label="Email" htmlFor="m-email" error={error}><Input id="m-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} invalid={!!error} autoFocus /></Field>
        <Field label="Role" htmlFor="m-role" hint="Staff can view, adjust stock and manage orders. Owners can also manage products and the team.">
          <Select id="m-role" value={role} onChange={(e) => setRole(e.target.value as Role)}><option value="staff">Staff</option><option value="owner">Owner</option></Select>
        </Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>Add member</Button></div>
      </form>
    </Modal>
  )
}

export default function TeamPage() {
  const ws = useWs()
  const { user } = useAuth()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<Member | null>(null)
  const { data, loading, error, reload } = useAsync(() => get<Member[]>(`${ws}/members`), [ws])

  async function changeRole(m: Member, role: Role) {
    try { await patch(`${ws}/members/${m.userId}`, { role }); toast('success', 'Role updated') }
    catch (err) { toast('error', err instanceof ApiError ? err.message : 'Something went wrong') }
    reload()
  }

  async function remove(m: Member) {
    try { await del(`${ws}/members/${m.userId}`); toast('success', `${m.name} removed`) }
    catch (err) { toast('error', err instanceof ApiError ? err.message : 'Something went wrong') }
    setRemoving(null)
    reload()
  }

  return (
    <>
      <PageHeader title="Team" subtitle="People with access to this workspace"
        actions={<Button onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" aria-hidden />Add member</Button>} />
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data && (
        <Card>
          <ul className="divide-y divide-slate-100">
            {data.map((m) => (
              <li key={m.userId} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{m.name}{m.userId === user?.id && <span className="ml-2 text-xs text-slate-500">(you)</span>}</div>
                  <div className="truncate text-sm text-slate-500">{m.email} · joined {formatDate(m.joinedAt)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Select aria-label={`Role for ${m.name}`} className="!w-28" value={m.role} onChange={(e) => changeRole(m, e.target.value as Role)}>
                    <option value="owner">Owner</option><option value="staff">Staff</option>
                  </Select>
                  <Button variant="ghost" className="text-red-600" aria-label={`Remove ${m.name}`} onClick={() => setRemoving(m)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {adding && <AddMemberModal onClose={() => setAdding(false)} onAdded={() => { setAdding(false); reload() }} />}
      {removing && <ConfirmDialog danger title="Remove member?" confirmLabel="Remove" onClose={() => setRemoving(null)} onConfirm={() => remove(removing)}
        message={<><strong>{removing.name}</strong> will immediately lose access to this workspace. Their past activity stays in the history.</>} />}
    </>
  )
}
