import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Inbox, Loader2, X, XCircle } from 'lucide-react'
import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react'
import type { OrderStatus, PageMeta } from '../api/types'

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

// ---------- Button ----------
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/50',
  secondary: 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-400',
}

export function Button({
  variant = 'primary', loading, className, children, disabled, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed',
        VARIANTS[variant], className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

// ---------- Form fields ----------
export function Field({ label, error, hint, children, htmlFor }: {
  label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}

const inputCls = (invalid?: boolean) =>
  cx('block w-full min-h-10 rounded-lg border bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-500 disabled:bg-slate-100',
    invalid ? 'border-red-400' : 'border-slate-300')

export function Input({ invalid, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...rest} aria-invalid={invalid || undefined} className={cx(inputCls(invalid), className)} />
}
export function Select({ invalid, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return <select {...rest} className={cx(inputCls(invalid), className)}>{children}</select>
}
export function Textarea({ invalid, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea {...rest} className={cx(inputCls(invalid), className)} />
}

// ---------- Layout bits ----------
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>{children}</div>
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> {label}
    </div>
  )
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
      <Inbox className="h-9 w-9 text-slate-300" aria-hidden />
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="max-w-sm text-sm text-slate-500">{hint}</p>}
      {action}
    </div>
  )
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex-1">{message}</div>
      {onRetry && <button onClick={onRetry} className="font-medium underline">Retry</button>}
    </div>
  )
}

// ---------- Badges ----------
const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 ring-amber-200',
  confirmed: 'bg-sky-100 text-sky-800 ring-sky-200',
  completed: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  cancelled: 'bg-slate-200 text-slate-600 ring-slate-300',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset', STATUS_STYLES[status])}>
      {status}
    </span>
  )
}

export function StockBadge({ low, active = true }: { low: boolean; active?: boolean }) {
  if (!active) return <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">Inactive</span>
  return low
    ? <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200"><AlertTriangle className="h-3 w-3" aria-hidden />Low stock</span>
    : <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">In stock</span>
}

// ---------- Modal / confirm ----------
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); prev?.focus() }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={cx('max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onClose }: {
  title: string; message: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => Promise<void> | void; onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal title={title} onClose={busy ? () => {} : onClose}>
      <div className="text-sm text-slate-600">{message}</div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={busy}>Keep as is</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={busy}
          onClick={async () => { setBusy(true); try { await onConfirm() } finally { setBusy(false) } }}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

// ---------- Pagination ----------
export function Pagination({ meta, onPage }: { meta: PageMeta; onPage: (p: number) => void }) {
  if (meta.total === 0) return null
  const from = (meta.page - 1) * meta.pageSize + 1
  const to = Math.min(meta.total, meta.page * meta.pageSize)
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
      <span>{from}–{to} of {meta.total}</span>
      <div className="flex items-center gap-1">
        <Button variant="secondary" className="!min-h-9 !px-2" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
        <span className="px-2">Page {meta.page} / {meta.totalPages}</span>
        <Button variant="secondary" className="!min-h-9 !px-2" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  )
}

// ---------- Toasts ----------
interface Toast { id: number; kind: 'success' | 'error'; text: string }
const ToastCtx = createContext<(kind: Toast['kind'], text: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, kind, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={cx('pointer-events-auto flex max-w-md items-start gap-2 rounded-lg px-4 py-3 text-sm text-white shadow-lg', t.kind === 'success' ? 'bg-emerald-600' : 'bg-red-600')}>
            {t.kind === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
