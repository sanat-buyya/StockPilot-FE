import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Inbox, Loader2, X, XCircle } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { showToast } from '../store/uiSlice'
const cx = (...c) => c.filter(Boolean).join(' ')
const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/50',
  secondary: 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-400',
}
export function Button({ variant = 'primary', loading, className, children, disabled, ...rest }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed',
        VARIANTS[variant],
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}
// ---------- Form fields ----------
export function Field({ label, error, hint, children, htmlFor }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
const inputCls = (invalid) =>
  cx(
    'block w-full min-h-10 rounded-lg border bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-500 disabled:bg-slate-100',
    invalid ? 'border-red-400' : 'border-slate-300',
  )
export function Input({ invalid, className, ...rest }) {
  return <input {...rest} aria-invalid={invalid || undefined} className={cx(inputCls(invalid), className)} />
}
export function Select({ invalid, className, children, ...rest }) {
  return (
    <select {...rest} className={cx(inputCls(invalid), className)}>
      {children}
    </select>
  )
}
export function Textarea({ invalid, className, ...rest }) {
  return <textarea {...rest} className={cx(inputCls(invalid), className)} />
}
// ---------- Layout bits ----------
export function Card({ children, className }) {
  return <div className={cx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>{children}</div>
}
/** Page-level actions (e.g. "New product"), right-aligned. The page name itself is shown in the top header bar. */
export function PageHeader({ actions }) {
  if (!actions) return null
  return <div className="mb-3 flex flex-wrap justify-end gap-2">{actions}</div>
}
export function Spinner({ label = 'Loading…' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> {label}
    </div>
  )
}
export function EmptyState({ title, hint, action }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
      <Inbox className="h-9 w-9 text-slate-300" aria-hidden />
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="max-w-sm text-sm text-slate-500">{hint}</p>}
      {action}
    </div>
  )
}
export function ErrorBanner({ message, onRetry }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex-1">{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="font-medium underline">
          Retry
        </button>
      )}
    </div>
  )
}
// ---------- Badges ----------
const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800 ring-amber-200',
  confirmed: 'bg-sky-100 text-sky-800 ring-sky-200',
  completed: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  cancelled: 'bg-slate-200 text-slate-600 ring-slate-300',
}
export function StatusBadge({ status }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset',
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  )
}
export function StockBadge({ low, active = true }) {
  if (!active) return <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">Inactive</span>
  return low ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
      <AlertTriangle className="h-3 w-3" aria-hidden />
      Low stock
    </span>
  ) : (
    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">
      In stock
    </span>
  )
}
// ---------- Modal / confirm ----------
export function Modal({ title, onClose, children, wide }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const prev = document.activeElement
    ref.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus()
    }
  }, [onClose])
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          'max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
export function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal title={title} onClose={busy ? () => {} : onClose}>
      <div className="text-sm text-slate-600">{message}</div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Keep as is
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          loading={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await onConfirm()
            } finally {
              setBusy(false)
            }
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
// ---------- Pagination ----------
export function Pagination({ meta, onPage }) {
  if (meta.total === 0) return null
  const from = (meta.page - 1) * meta.pageSize + 1
  const to = Math.min(meta.total, meta.page * meta.pageSize)
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
      <span>
        {from}–{to} of {meta.total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          className="!min-h-9 !px-2"
          disabled={meta.page <= 1}
          onClick={() => onPage(meta.page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2">
          Page {meta.page} / {meta.totalPages}
        </span>
        <Button
          variant="secondary"
          className="!min-h-9 !px-2"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPage(meta.page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ---------- Toasts (state lives in the Redux ui slice) ----------
/** Returns toast(kind, text); kind is 'success' | 'error'. */
export function useToast() {
  const dispatch = useDispatch()
  return useCallback((kind, text) => dispatch(showToast(kind, text)), [dispatch])
}

export function Toaster() {
  const toasts = useSelector((s) => s.ui.toasts)
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cx(
            'pointer-events-auto flex max-w-md items-start gap-2 rounded-lg px-4 py-3 text-sm text-white shadow-lg',
            t.kind === 'success' ? 'bg-emerald-600' : 'bg-red-600',
          )}
        >
          {t.kind === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}

// ---------- Filter helpers ----------
/** Rounded on/off button used for quick filters. */
export function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset transition-colors',
        active ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50',
      )}
    >
      {children}
    </button>
  )
}

/** Compact "From – To" date inputs (YYYY-MM-DD). */
export function DateInputs({ from, to, onFrom, onTo, invalid, fromLabel = 'From date', toLabel = 'To date' }) {
  return (
    <div className="flex items-center gap-2">
      <Input
        aria-label={fromLabel}
        type="date"
        className="!min-h-9 !w-40 !py-1"
        value={from}
        max={to || undefined}
        onChange={(e) => onFrom(e.target.value)}
      />
      <span className="text-slate-400" aria-hidden>
        –
      </span>
      <Input
        aria-label={toLabel}
        type="date"
        className="!min-h-9 !w-40 !py-1"
        value={to}
        min={from || undefined}
        onChange={(e) => onTo(e.target.value)}
        invalid={invalid}
      />
    </div>
  )
}
