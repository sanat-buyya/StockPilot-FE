import { Link, useSearchParams } from 'react-router-dom'
import { getPaged } from '../api/client'
import type { Adjustment, Product } from '../api/types'
import { useWs } from '../auth/AuthContext'
import { Card, EmptyState, ErrorBanner, Input, PageHeader, Pagination, Select, Spinner } from '../components/ui'
import { REASON_LABELS, formatDateTime, signed } from '../lib/format'
import { useAsync } from '../lib/hooks'

export default function InventoryPage() {
  const ws = useWs()
  const [sp, setSp] = useSearchParams()
  const productId = sp.get('productId') ?? ''
  const reasonType = sp.get('reasonType') ?? ''
  const from = sp.get('from') ?? ''
  const to = sp.get('to') ?? ''
  const page = Number(sp.get('page') ?? 1)
  const rangeInvalid = !!from && !!to && to < from

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(changes)) v ? next.set(k, v) : next.delete(k)
    if (!('page' in changes)) next.delete('page')
    setSp(next, { replace: true })
  }

  const products = useAsync(() => getPaged<Product>(`${ws}/products`, { pageSize: 100, sort: 'name' }), [ws])
  const { data, loading, error, reload } = useAsync(
    () => rangeInvalid ? Promise.resolve(null) : getPaged<Adjustment>(`${ws}/inventory/adjustments`, { productId, reasonType, from, to, page, pageSize: 15 }),
    [ws, productId, reasonType, from, to, page],
  )

  return (
    <>
      <PageHeader title="Stock history" subtitle="Audit trail of every stock change: manual adjustments and order reservations. Dates are UTC days." />
      <Card>
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select aria-label="Product filter" value={productId} onChange={(e) => update({ productId: e.target.value })}>
            <option value="">All products</option>
            {products.data?.data.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
          </Select>
          <Select aria-label="Reason filter" value={reasonType} onChange={(e) => update({ reasonType: e.target.value })}>
            <option value="">All reasons</option>
            {Object.entries(REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Input aria-label="From date" type="date" value={from} max={to || undefined} onChange={(e) => update({ from: e.target.value })} />
          <Input aria-label="To date" type="date" value={to} min={from || undefined} onChange={(e) => update({ to: e.target.value })} invalid={rangeInvalid} />
        </div>
        {rangeInvalid && <div className="p-4"><ErrorBanner message={'"To" date is before "From" date.'} /></div>}
        {error && <div className="p-4"><ErrorBanner message={error} onRetry={reload} /></div>}
        {loading && !data && !rangeInvalid && <Spinner />}
        {data && data.data.length === 0 && <EmptyState title="No stock changes found" hint="Adjust a product's stock or place an order to see entries here." />}
        {data && data.data.length > 0 && (
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <ul className="divide-y divide-slate-100">
              {data.data.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <Link to={`/products/${a.productId}`} className="block truncate font-medium hover:underline">{a.productName} <span className="font-mono text-xs text-slate-500">{a.productSku}</span></Link>
                    <div className="truncate text-xs text-slate-500">
                      {REASON_LABELS[a.reasonType] ?? a.reasonType} · {a.createdBy.name} · {formatDateTime(a.createdAt)}
                      {a.orderId && <> · <Link to={`/orders/${a.orderId}`} className="text-brand-600 hover:underline">order</Link></>}
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
            <Pagination meta={data.meta} onPage={(n) => update({ page: String(n) })} />
          </div>
        )}
      </Card>
    </>
  )
}
