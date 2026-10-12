import { Trash2, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useAuth } from '../auth/useAuth'
import { Button, Card, ConfirmDialog, ErrorBanner, Field, Input, Modal, PageHeader, Select, Spinner, useToast } from '../components/ui'
import { formatDate } from '../lib/format'
import { errorMessage } from '../lib/hooks'
import { addMember, changeMemberRole, fetchMembers, removeMember, selectTeam } from '../store/teamSlice'

function AddMemberModal({ onClose, onAdded }) {
  const dispatch = useDispatch()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email')
      return
    }
    setBusy(true)
    try {
      await dispatch(addMember({ email: email.trim(), role })).unwrap()
      toast('success', 'Member added')
      onAdded()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Add team member" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-sm text-slate-600">
          The person must already have a StockPilot account. Ask them to register first, then add them by email.
        </p>
        <Field label="Email" htmlFor="m-email" error={error}>
          <Input
            id="m-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
            }}
            invalid={!!error}
            autoFocus
          />
        </Field>
        <Field
          label="Role"
          htmlFor="m-role"
          hint="Staff can view, adjust stock and manage orders. Owners can also manage products and the team."
        >
          <Select id="m-role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="staff">Staff</option>
            <option value="owner">Owner</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Add member
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function TeamPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState(null)
  const { items, status, error } = useSelector(selectTeam)

  useEffect(() => {
    dispatch(fetchMembers())
  }, [dispatch])

  async function changeRole(m, role) {
    try {
      await dispatch(changeMemberRole({ userId: m.userId, role })).unwrap()
      toast('success', 'Role updated')
    } catch (err) {
      toast('error', errorMessage(err))
      dispatch(fetchMembers()) // put the select back to the server's value
    }
  }

  async function remove(m) {
    try {
      await dispatch(removeMember(m.userId)).unwrap()
      toast('success', `${m.name} removed`)
    } catch (err) {
      toast('error', errorMessage(err))
    }
    setRemoving(null)
  }

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="People with access to this workspace"
        actions={
          <Button onClick={() => setAdding(true)}>
            <UserPlus className="h-4 w-4" aria-hidden />
            Add member
          </Button>
        }
      />
      {error && <ErrorBanner message={error} onRetry={() => dispatch(fetchMembers())} />}
      {status === 'loading' && items.length === 0 && <Spinner />}
      {items.length > 0 && (
        <Card>
          <ul className="divide-y divide-slate-100">
            {items.map((m) => (
              <li key={m.userId} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {m.name}
                    {m.userId === user?.id && <span className="ml-2 text-xs text-slate-500">(you)</span>}
                  </div>
                  <div className="truncate text-sm text-slate-500">
                    {m.email} · joined {formatDate(m.joinedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    aria-label={`Role for ${m.name}`}
                    className="!w-28"
                    value={m.role}
                    onChange={(e) => changeRole(m, e.target.value)}
                  >
                    <option value="owner">Owner</option>
                    <option value="staff">Staff</option>
                  </Select>
                  <Button variant="ghost" className="text-red-600" aria-label={`Remove ${m.name}`} onClick={() => setRemoving(m)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {adding && (
        <AddMemberModal
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false)
            dispatch(fetchMembers())
          }}
        />
      )}
      {removing && (
        <ConfirmDialog
          danger
          title="Remove member?"
          confirmLabel="Remove"
          onClose={() => setRemoving(null)}
          onConfirm={() => remove(removing)}
          message={
            <>
              <strong>{removing.name}</strong> will immediately lose access to this workspace. Their past activity stays in the history.
            </>
          }
        />
      )}
    </>
  )
}
