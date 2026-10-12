import { ArrowLeft, Minus, Plus, Search, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, getPaged, post } from '../api/client'
import { useWs } from '../auth/AuthContext'
import { Button, Card, EmptyState, ErrorBanner, Field, Input, Spinner, StockBadge, Textarea, useToast } from '../components/ui'
import { centsToString, formatMoney, toCents } from '../lib/format'
import { useAsync, useDebounced } from '../lib/hooks'
export default function OrderNewPage() {
  const ws = useWs()
  const nav = useNavigate()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const q = useDebounced(search)
  const [lines, setLines] = useState([])
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [problems, setProblems] = useState([])
  // One key per form instance: if the request is retried (double click, network blip) the server returns the same order.
  const idemKey = useRef(`order-${crypto.randomUUID()}`)
  const products = useAsync(() => getPaged(`${ws}/products`, { q, active: true, pageSize: 8 }), [ws, q])
  const lineFor = (id) => lines.find((l) => l.product.id === id)
  const add = (product) => {
    setProblems([])
    setLines((ls) =>
      ls.some((l) => l.product.id === product.id)
        ? ls.map((l) => (l.product.id === product.id ? { ...l, quantity: Math.min(l.quantity + 1, product.stockQuantity) } : l))
        : [...ls, { product, quantity: 1 }],
    )
  }
  const setQty = (id, quantity) => setLines((ls) => ls.map((l) => (l.product.id === id ? { ...l, quantity } : l)))
  const remove = (id) => setLines((ls) => ls.filter((l) => l.product.id !== id))
  const estimateCents = lines.reduce(
    (sum, l) => sum + toCents(l.product.unitPrice) * (Number.isInteger(l.quantity) && l.quantity > 0 ? l.quantity : 0),
    0,
  )
  const lineError = (l) =>
    !Number.isInteger(l.quantity) || l.quantity < 1
      ? 'Quantity must be at least 1'
      : l.quantity > l.product.stockQuantity
        ? `Only ${l.product.stockQuantity} in stock`
        : ''
  const hasLineErrors = lines.some((l) => lineError(l))
  async function submit() {
    if (lines.length === 0 || hasLineErrors || busy) return
    setBusy(true)
    setError('')
    setProblems([])
    try {
      const order = await post(
        `${ws}/orders`,
        {
          items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
          notes: notes.trim() || undefined,
        },
        { 'Idempotency-Key': idemKey.current },
      )
      toast('success', `${order.orderNumber} created — stock reserved`)
      nav(`/orders/${order.id}`, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        if (Array.isArray(err.details)) setProblems(err.details)
        // Stock may have changed under us: refresh the picker so the numbers shown are current.
        if (err.code === 'INSUFFICIENT_STOCK' || err.code === 'INACTIVE_PRODUCT') products.reload()
      } else setError('Something went wrong')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Link to="/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Orders
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">New order</h1>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <div className="border-b border-slate-200 p-4">
            <h2 className="mb-2 font-semibold">Add products</h2>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
              <Input
                aria-label="Search products"
                placeholder="Search active products"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          {products.loading && !products.data && <Spinner />}
          {products.error && (
            <div className="p-4">
              <ErrorBanner message={products.error} onRetry={products.reload} />
            </div>
          )}
          {products.data && products.data.data.length === 0 && (
            <EmptyState title="No active products found" hint="Only active products can be ordered." />
          )}
          <ul className="divide-y divide-slate-100">
            {products.data?.data.map((p) => {
              const inCart = lineFor(p.id)
              const out = p.stockQuantity === 0
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-slate-500">
                      <span className="font-mono">{p.sku}</span> · {formatMoney(p.unitPrice)} · {p.stockQuantity} in stock
                    </div>
                    <div className="mt-1">
                      <StockBadge low={p.lowStock} />
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    className="!min-h-9 shrink-0"
                    disabled={out || (inCart ? inCart.quantity >= p.stockQuantity : false)}
                    onClick={() => add(p)}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    {out ? 'Out of stock' : inCart ? 'Add one' : 'Add'}
                  </Button>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card className="lg:col-span-3">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-semibold">Order items</h2>
          </div>
          {lines.length === 0 ? (
            <EmptyState title="No items yet" hint="Add one or more products from the list to build the order." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {lines.map((l) => {
                const err = lineError(l)
                const serverProblem = problems.find((p) => p.productId === l.product.id)
                return (
                  <li key={l.product.id} className="space-y-1 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{l.product.name}</div>
                        <div className="text-xs text-slate-500">
                          {formatMoney(l.product.unitPrice)} each · {l.product.stockQuantity} available
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="secondary"
                          className="!min-h-9 !px-2"
                          aria-label={`Decrease ${l.product.name}`}
                          disabled={l.quantity <= 1}
                          onClick={() => setQty(l.product.id, l.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          aria-label={`Quantity for ${l.product.name}`}
                          inputMode="numeric"
                          className="!w-16 text-center"
                          value={Number.isNaN(l.quantity) ? '' : l.quantity}
                          invalid={!!err}
                          onChange={(e) => setQty(l.product.id, e.target.value === '' ? NaN : Number(e.target.value))}
                        />
                        <Button
                          variant="secondary"
                          className="!min-h-9 !px-2"
                          aria-label={`Increase ${l.product.name}`}
                          disabled={l.quantity >= l.product.stockQuantity}
                          onClick={() => setQty(l.product.id, l.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="w-24 text-right font-medium tabular-nums">
                        {err ? '—' : formatMoney(centsToString(toCents(l.product.unitPrice) * l.quantity))}
                      </div>
                      <Button
                        variant="ghost"
                        className="!min-h-9 !px-2 text-red-600"
                        aria-label={`Remove ${l.product.name}`}
                        onClick={() => remove(l.product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {(err || serverProblem) && (
                      <p role="alert" className="text-xs font-medium text-red-600">
                        {err || serverProblem?.message}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <div className="space-y-4 border-t border-slate-200 p-4">
            <Field label="Notes (optional)" htmlFor="o-notes">
              <Textarea id="o-notes" rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            {error && <ErrorBanner message={error} />}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Estimated total</div>
                <div className="text-2xl font-semibold tabular-nums">{formatMoney(centsToString(estimateCents))}</div>
                <p className="text-xs text-slate-500">The server recalculates the final total from current prices.</p>
              </div>
              <Button onClick={submit} loading={busy} disabled={lines.length === 0 || hasLineErrors}>
                Place order
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
