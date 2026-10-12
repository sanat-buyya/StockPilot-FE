import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, DateInputs, EmptyState, ErrorBanner, Pagination, Select, Spinner } from '../components/ui'
import { REASON_LABELS, formatDateTime, signed } from '../lib/format'
import { fetchAdjustments, selectAdjustments } from '../store/inventorySlice'
import { fetchProductOptions, selectProductOptions } from '../store/productsSlice'
import { PAGE_SIZE } from '../lib/constants'

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
  const load = () => dispatch(fetchAdjustments({ productId, reasonType, from, to, page, pageSize: PAGE_SIZE }))

  useEffect(() => {
    dispatch(fetchProductOptions({ pageSize: 100, sort: 'name' }))
  }, [dispatch])
  useEffect(() => {
    if (!rangeInvalid) dispatch(fetchAdjustments({ productId, reasonType, from, to, page, pageSize: PAGE_SIZE }))
  }, [dispatch, rangeInvalid, productId, reasonType, from, to, page])

  const hasData = meta !== null

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 p-3">
          <Select
            aria-label="Product filter"
            className="!min-h-9 !w-64 !py-1"
            value={productId}
            onChange={(e) => update({ productId: e.target.value })}
          >
            <option value="">All products</option>
            {products.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </Select>
          <Select
            aria-label="Reason filter"
            className="!min-h-9 !w-56 !py-1"
            value={reasonType}
            onChange={(e) => update({ reasonType: e.target.value })}
          >
            <option value="">All reasons</option>
            {Object.entries(REASON_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-2 lg:ml-auto">
            <DateInputs from={from} to={to} onFrom={(v) => update({ from: v })} onTo={(v) => update({ to: v })} invalid={rangeInvalid} />
            {(productId || reasonType || from || to) && (
              <button
                type="button"
                onClick={() => setSp({}, { replace: true })}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Clear
              </button>
            )}
          </div>
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
