import { Boxes } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Button, ErrorBanner, Field, Input } from '../components/ui'

function Shell({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-2xl font-bold text-brand-700">
          <Boxes className="h-7 w-7" aria-hidden /> StockPilot
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-5 text-xl font-semibold">{title}</h1>
          {children}
        </div>
        <p className="mt-4 text-center text-sm text-slate-600">{footer}</p>
      </div>
    </div>
  )
}

export function LoginPage() {
  const { user, login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})

  if (user) return <Navigate to="/" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    const f: Record<string, string> = {}
    if (!email.trim()) f.email = 'Email is required'
    if (!password) f.password = 'Password is required'
    setFields(f)
    if (Object.keys(f).length) return
    setBusy(true); setError('')
    try { await login(email.trim(), password); nav('/', { replace: true }) }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Something went wrong') }
    finally { setBusy(false) }
  }

  return (
    <Shell title="Sign in" footer={<>New here? <Link to="/register" className="font-medium text-brand-600 hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <ErrorBanner message={error} />}
        <Field label="Email" htmlFor="email" error={fields.email}>
          <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!fields.email} />
        </Field>
        <Field label="Password" htmlFor="password" error={fields.password}>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!fields.password} />
        </Field>
        <Button type="submit" className="w-full" loading={busy}>Sign in</Button>
      </form>
      <div className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <p className="mb-1 font-semibold">Demo accounts (password <code>Demo@12345</code>)</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded bg-white px-2 py-1 ring-1 ring-slate-300 hover:bg-slate-100" onClick={() => { setEmail('owner@stockpilot.demo'); setPassword('Demo@12345') }}>Fill owner</button>
          <button type="button" className="rounded bg-white px-2 py-1 ring-1 ring-slate-300 hover:bg-slate-100" onClick={() => { setEmail('staff@stockpilot.demo'); setPassword('Demo@12345') }}>Fill staff</button>
        </div>
      </div>
    </Shell>
  )
}

export function RegisterPage() {
  const { user, register } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', workspaceName: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  if (user) return <Navigate to="/" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    const f: Record<string, string> = {}
    if (!form.name.trim()) f.name = 'Name is required'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) f.email = 'Enter a valid email'
    if (form.password.length < 8) f.password = 'Password must be at least 8 characters'
    setFields(f)
    if (Object.keys(f).length) return
    setBusy(true); setError('')
    try {
      await register({ ...form, name: form.name.trim(), email: form.email.trim(), workspaceName: form.workspaceName.trim() || undefined })
      nav('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setFields(err.fieldErrors)
      else setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally { setBusy(false) }
  }

  return (
    <Shell title="Create your account" footer={<>Already registered? <Link to="/login" className="font-medium text-brand-600 hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <ErrorBanner message={error} />}
        <Field label="Your name" htmlFor="name" error={fields.name}><Input id="name" value={form.name} onChange={set('name')} invalid={!!fields.name} autoComplete="name" /></Field>
        <Field label="Email" htmlFor="email" error={fields.email}><Input id="email" type="email" value={form.email} onChange={set('email')} invalid={!!fields.email} autoComplete="username" /></Field>
        <Field label="Password" htmlFor="password" error={fields.password} hint="At least 8 characters"><Input id="password" type="password" value={form.password} onChange={set('password')} invalid={!!fields.password} autoComplete="new-password" /></Field>
        <Field label="Workspace name (optional)" htmlFor="workspaceName" error={fields.workspaceName} hint="Your business or team. You become its owner."><Input id="workspaceName" value={form.workspaceName} onChange={set('workspaceName')} invalid={!!fields.workspaceName} /></Field>
        <Button type="submit" className="w-full" loading={busy}>Create account</Button>
      </form>
    </Shell>
  )
}
