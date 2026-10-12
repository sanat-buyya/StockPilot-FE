import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, EmptyState, ErrorBanner, Input, Pagination, Select, Spinner } from '../components/ui'
import { REASON_LABELS, formatDateTime, signed } from '../lib/format'
import { fetchAdjustments, selectAdjustments } from '../store/inventorySlice'
import { fetchProductOptions, selectProductOptions } from '../store/productsSlice'

export default function InventoryPage() {
  const dispatch = useDispatch()
  const [sp, setSp] = useSearchParams()
  const productId = sp.get('productId') ?? ''
  const reasonType = sp.get('reasonType') ?? ''
  const from = sp.get('from') ?? ''
  const to = sp.get('to') ?? ''
  const page = Number(sp.get('page') ?? 1)
  const rangeInvalid = !!from && !!to && to < from

  const update = (changes) => {
    const next = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('page' in changes)) next.delete('page')
    setSp(next, { replace: true })
  }

  const products = useSelector(selectProductOptions)
  const { items, meta, status, error } = useSelector(selectAdjustments)
  const loading = status === 'loading'
  const load = () => dispatch(fetchAdjustments({ productId, reasonType, from, to, page, pageSize: 15 }))

  useEffect(() => {
    dispatch(fetchProductOptions({ pageSize: 100, sort: 'name' }))
  }, [dispatch])
  useEffect(() => {
    if (!rangeInvalid) dispatch(fetchAdjustments({ productId, reasonType, from, to, page, pageSize: 15 }))
  }, [dispatch, rangeInvalid, productId, reasonType, from, to, page])

  const hasData = meta !== null

  return (
    <>
      <Card>
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select aria-label="Product filter" value={productId} onChange={(e) => update({ productId: e.target.value })}>
            <option value="">All products</option>
            {products.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </Select>
          <Select aria-label="Reason filter" value={reasonType} onChange={(e) => update({ reasonType: e.target.value })}>
            <option value="">All reasons</option>
            {Object.entries(REASON_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Input aria-label="From date" type="date" value={from} max={to || undefined} onChange={(e) => update({ from: e.target.value })} />
          <Input
            aria-label="To date"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => update({ to: e.target.value })}
            invalid={rangeInvalid}
          />
        </div>
        {rangeInvalid && (
          <div className="p-4">
            <ErrorBanner message={'"To" date is before "From" date.'} />
          </div>
        )}
        {error && (
          <div className="p-4">
            <ErrorBanner message={error} onRetry={load} />
          </div>
        )}
        {loading && !hasData && !rangeInvalid && <Spinner />}
        {hasData && items.length === 0 && (
          <EmptyState title="No stock changes found" hint="Adjust a product's stock or place an order to see entries here." />
        )}
        {hasData && items.length > 0 && (
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <ul className="divide-y divide-slate-100">
              {items.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <Link to={`/products/${a.productId}`} className="block truncate font-medium hover:underline">
                      {a.productName} <span className="font-mono text-xs text-slate-500">{a.productSku}</span>
                    </Link>
                    <div className="truncate text-xs text-slate-500">
                      {REASON_LABELS[a.reasonType] ?? a.reasonType} · {a.createdBy.name} · {formatDateTime(a.createdAt)}
                      {a.orderId && (
                        <>
                          {' '}
                          ·{' '}
                          <Link to={`/orders/${a.orderId}`} className="text-brand-600 hover:underline">
                            order
                          </Link>
                        </>
                      )}
                      {a.note && <> · “{a.note}”</>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <div className={`font-semibold ${a.quantityChange < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {signed(a.quantityChange)}
                    </div>
                    <div className="text-xs text-slate-500">stock → {a.resultingStock}</div>
                  </div>
                </li>
              ))}
            </ul>
            <Pagination meta={meta} onPage={(n) => update({ page: String(n) })} />
          </div>
        )}
      </Card>
    </>
  )
}
