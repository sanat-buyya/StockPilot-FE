import { ArrowLeft, Pencil, Power, SlidersHorizontal } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, get, getPaged, patch, post } from '../api/client'
import type { Adjustment, Product } from '../api/types'
import { useAuth, useWs } from '../auth/AuthContext'
import ProductForm from '../components/ProductForm'
import {
  Button, Card, ConfirmDialog, EmptyState, ErrorBanner, Field, Input, Modal, Pagination, Select, Spinner, StockBadge, useToast,
} from '../components/ui'
import { REASON_LABELS, formatDateTime, formatMoney, signed } from '../lib/format'
import { useAsync } from '../lib/hooks'

const MANUAL = ['received', 'count_correction', 'damaged', 'returned', 'other'] as const

function AdjustModal({ product, onClose, onDone }: { product: Product; onClose: () => void; onDone: () => void }) {
  const ws = useWs()
  const toast = useToast()
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState<(typeof MANUAL)[number]>('received')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [confirming, setConfirming] = useState(false)

  const n = Number(qty)
  function validate() {
    const er: Record<string, string> = {}
    if (!/^[+-]?\d+$/.test(qty.trim()) || n === 0) er.quantityChange = 'Enter a whole number other than 0 (use a minus for removals)'
    else if (product.stockQuantity + n < 0) er.quantityChange = `Stock cannot go below 0 (current: ${product.stockQuantity})`
    else if ((reason === 'received' || reason === 'returned') && n < 0) er.quantityChange = `"${REASON_LABELS[reason]}" must be a positive number`
    else if (reason === 'damaged' && n > 0) er.quantityChange = '"Damaged / lost" must be a negative number'
    if (reason === 'other' && !note.trim()) er.note = 'A note is required for “Other”'
    return er
  }

  function review(e: FormEvent) {
    e.preventDefault()
    const er = validate()
    setErrors(er)
    if (Object.keys(er).length === 0) setConfirming(true)
  }

  async function apply() {
    setFormError('')
    try {
      await post<Product>(`${ws}/products/${product.id}/adjustments`, { quantityChange: n, reasonType: reason, note: note.trim() || undefined })
      toast('success', `Stock updated to ${product.stockQuantity + n}`)
      onDone()
    } catch (err) {
      setConfirming(false)
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors)
      else setFormError(err instanceof ApiError ? err.message : 'Something went wrong')
    }
  }

  if (confirming) {
    return (
      <ConfirmDialog
        title="Confirm stock adjustment" confirmLabel="Apply adjustment" onClose={() => setConfirming(false)} onConfirm={apply}
        message={<>Change <strong>{product.name}</strong> stock by <strong>{signed(n)}</strong> ({REASON_LABELS[reason]}): <strong>{product.stockQuantity} → {product.stockQuantity + n}</strong>. This is recorded in the audit history and cannot be edited later.</>}
      />
    )
  }

  return (
    <Modal title={`Adjust stock · ${product.name}`} onClose={onClose}>
      <form onSubmit={review} className="space-y-4" noValidate>
        {formError && <ErrorBanner message={formError} />}
        <p className="text-sm text-slate-600">Current stock: <strong className="tabular-nums">{product.stockQuantity}</strong></p>
        <Field label="Reason" htmlFor="a-reason">
          <Select id="a-reason" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
            {MANUAL.map((r) => <option key={r} value={r}>{REASON_LABELS[r]}</option>)}
          </Select>
        </Field>
        <Field label="Quantity change" htmlFor="a-qty" error={errors.quantityChange} hint="Positive adds stock, negative removes it">
          <Input id="a-qty" inputMode="numeric" value={qty} onChange={(e) => { setQty(e.target.value); setErrors({}) }} invalid={!!errors.quantityChange} placeholder="e.g. 25 or -3" autoFocus />
        </Field>
        <Field label={reason === 'other' ? 'Note (required)' : 'Note (optional)'} htmlFor="a-note" error={errors.note}>
          <Input id="a-note" value={note} onChange={(e) => { setNote(e.target.value); setErrors((x) => ({ ...x, note: '' })) }} maxLength={500} invalid={!!errors.note} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Review</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function ProductDetailPage() {
  const { id } = useParams()
  const ws = useWs()
  const { isOwner } = useAuth()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [adjusting, setAdjusting] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const product = useAsync(() => get<Product>(`${ws}/products/${id}`), [ws, id])
  const history = useAsync(() => getPaged<Adjustment>(`${ws}/products/${id}/adjustments`, { page, pageSize: 10, from, to }), [ws, id, page, from, to])

  const p = product.data
  const refresh = () => { product.reload(); history.reload() }

  async function toggleActive() {
    if (!p) return
    try {
      await patch<Product>(`${ws}/products/${p.id}`, { active: !p.active })
      toast('success', p.active ? 'Product deactivated' : 'Product reactivated')
      setToggling(false)
      product.reload()
    } catch (err) {
      setToggling(false)
      toast('error', err instanceof ApiError ? err.message : 'Something went wrong')
    }
  }

  if (product.loading && !p) return <Spinner />
  if (product.error || !p) {
    return (
      <>
        <Link to="/products" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"><ArrowLeft className="h-4 w-4" />Products</Link>
        <ErrorBanner message={product.error ?? 'Product not found'} onRetry={product.reload} />
      </>
    )
  }

  return (
    <>
      <Link to="/products" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden />Products</Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
          <p className="mt-1 font-mono text-sm text-slate-500">{p.sku}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setAdjusting(true)}><SlidersHorizontal className="h-4 w-4" aria-hidden />Adjust stock</Button>
          {isOwner && <Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden />Edit</Button>}
          {isOwner && <Button variant="secondary" onClick={() => setToggling(true)}><Power className="h-4 w-4" aria-hidden />{p.active ? 'Deactivate' : 'Reactivate'}</Button>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm text-slate-500">Current stock</div>
          <div className="mt-1 text-4xl font-semibold tabular-nums">{p.stockQuantity}</div>
          <div className="mt-2"><StockBadge low={p.lowStock} active={p.active} /></div>
          <div className="mt-2 text-xs text-slate-500">Low-stock threshold: {p.lowStockThreshold}</div>
        </Card>
        <Card className="p-4 md:col-span-2">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-slate-500">Unit price</dt><dd className="mt-0.5 text-lg font-semibold tabular-nums">{formatMoney(p.unitPrice)}</dd></div>
            <div><dt className="text-slate-500">Status</dt><dd className="mt-0.5 font-medium">{p.active ? 'Active — can be ordered' : 'Inactive — hidden from new orders'}</dd></div>
            <div className="col-span-2"><dt className="text-slate-500">Description</dt><dd className="mt-0.5">{p.description || '—'}</dd></div>
            <div><dt className="text-slate-500">Created</dt><dd className="mt-0.5">{formatDateTime(p.createdAt)}</dd></div>
            <div><dt className="text-slate-500">Updated</dt><dd className="mt-0.5">{formatDateTime(p.updatedAt)}</dd></div>
          </dl>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="font-semibold">Stock history</h2>
            <p className="text-xs text-slate-500">Every change to this product's stock, newest first. Dates are UTC days.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Field label="From" htmlFor="h-from"><Input id="h-from" type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1) }} /></Field>
            <Field label="To" htmlFor="h-to"><Input id="h-to" type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1) }} /></Field>
          </div>
        </div>
        {history.error && <div className="p-4"><ErrorBanner message={history.error} onRetry={history.reload} /></div>}
        {history.loading && !history.data && <Spinner />}
        {history.data && history.data.data.length === 0 && <EmptyState title="No stock changes in this period" />}
        {history.data && history.data.data.length > 0 && (
          <>
            <ul className="divide-y divide-slate-100">
              {history.data.data.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium">{REASON_LABELS[a.reasonType] ?? a.reasonType}</div>
                    <div className="truncate text-xs text-slate-500">
                      {a.createdBy.name} · {formatDateTime(a.createdAt)}
                      {a.orderId && <> · <Link to={`/orders/${a.orderId}`} className="text-brand-600 hover:underline">view order</Link></>}
                      {a.note && <> · “{a.note}”</>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <div className={`font-semibold ${a.quantityChange < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{signed(a.quantityChange)}</div>
                    <div className="text-xs text-slate-500">stock → {a.resultingStock}</div>
                  </div>
                </li>
              ))}
            </ul>
            <Pagination meta={history.data.meta} onPage={setPage} />
          </>
        )}
      </Card>

      {editing && <ProductForm product={p} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); product.reload() }} />}
      {adjusting && <AdjustModal product={p} onClose={() => setAdjusting(false)} onDone={() => { setAdjusting(false); refresh() }} />}
      {toggling && (
        <ConfirmDialog
          title={p.active ? 'Deactivate product?' : 'Reactivate product?'} danger={p.active}
          confirmLabel={p.active ? 'Deactivate' : 'Reactivate'} onClose={() => setToggling(false)} onConfirm={toggleActive}
          message={p.active ? 'It will no longer be available for new orders. Existing orders keep their history.' : 'It will be available for new orders again.'}
        />
      )}
    </>
  )
}
