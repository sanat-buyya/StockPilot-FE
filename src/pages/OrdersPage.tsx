import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getPaged } from '../api/client'
import type { Order } from '../api/types'
import { useWs } from '../auth/AuthContext'
import { Button, Card, EmptyState, ErrorBanner, Input, PageHeader, Pagination, Select, Spinner, StatusBadge } from '../components/ui'
import { formatDateTime, formatMoney } from '../lib/format'
import { useAsync, useDebounced } from '../lib/hooks'

export default function OrdersPage() {
  const ws = useWs()
  const [sp, setSp] = useSearchParams()
  const [qInput, setQInput] = useState(sp.get('q') ?? '')
  const q = useDebounced(qInput)
  const status = sp.get('status') ?? ''
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

  const { data, loading, error, reload } = useAsync(
    () => rangeInvalid ? Promise.resolve(null) : getPaged<Order>(`${ws}/orders`, { status, q, from, to, page, pageSize: 10 }),
    [ws, status, q, from, to, page],
  )
  const filtered = !!(status || q || from || to)

  return (
    <>
      <PageHeader title="Orders" subtitle="Stock is reserved when an order is created and returned if it is cancelled"
        actions={<Link to="/orders/new"><Button><Plus className="h-4 w-4" aria-hidden />New order</Button></Link>} />

      <Card>
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <Input aria-label="Search by order number" placeholder="Order number, e.g. ORD-000012" className="pl-9" value={qInput}
              onChange={(e) => { setQInput(e.target.value); update({ q: e.target.value }) }} />
          </div>
          <Select aria-label="Status filter" value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="">All statuses</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
          </Select>
          <Input aria-label="Created from" type="date" value={from} max={to || undefined} onChange={(e) => update({ from: e.target.value })} />
          <Input aria-label="Created to" type="date" value={to} min={from || undefined} onChange={(e) => update({ to: e.target.value })} invalid={rangeInvalid} />
        </div>
        {rangeInvalid && <div className="p-4"><ErrorBanner message={'"To" date is before "From" date.'} /></div>}
        {error && <div className="p-4"><ErrorBanner message={error} onRetry={reload} /></div>}
        {loading && !data && !rangeInvalid && <Spinner />}
        {data && data.data.length === 0 && (
          <EmptyState title={filtered ? 'No orders match your filters' : 'No orders yet'}
            hint={filtered ? 'Dates are UTC days. Try widening the range.' : 'Create an order to reserve stock for a customer.'}
            action={filtered ? <Button variant="secondary" onClick={() => { setQInput(''); setSp({}, { replace: true }) }}>Clear filters</Button> : <Link to="/orders/new"><Button>New order</Button></Link>} />
        )}
        {data && data.data.length > 0 && (
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Created by</th><th className="px-4 py-3">Created</th><th className="px-4 py-3 text-right">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.data.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium"><Link to={`/orders/${o.id}`} className="text-brand-700 hover:underline">{o.orderNumber}</Link></td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-slate-600">{o.itemCount} product{o.itemCount === 1 ? '' : 's'} · {o.unitCount} unit{o.unitCount === 1 ? '' : 's'}</td>
                      <td className="px-4 py-3 text-slate-600">{o.createdBy.name}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(o.createdAt)}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{formatMoney(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {data.data.map((o) => (
                <li key={o.id}>
                  <Link to={`/orders/${o.id}`} className="block space-y-1 p-4">
                    <div className="flex items-center justify-between"><span className="font-medium">{o.orderNumber}</span><StatusBadge status={o.status} /></div>
                    <div className="flex items-center justify-between text-sm text-slate-500"><span>{formatDateTime(o.createdAt)}</span><span className="font-medium tabular-nums text-slate-900">{formatMoney(o.total)}</span></div>
                  </Link>
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
