import { Plus, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, Card, Chip, DateInputs, EmptyState, ErrorBanner, Input, Pagination, Spinner, StatusBadge } from '../components/ui'
import { formatDateTime, formatMoney } from '../lib/format'
import { useDebounced } from '../lib/hooks'
import { fetchOrders, selectOrdersList } from '../store/ordersSlice'
import { PAGE_SIZE } from '../lib/constants'

const STATUS_CHIPS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
]

export default function OrdersPage() {
  const dispatch = useDispatch()
  const [sp, setSp] = useSearchParams()
  const [qInput, setQInput] = useState(sp.get('q') ?? '')
  const q = useDebounced(qInput)
  const status = sp.get('status') ?? ''
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

  const { items, meta, status: loadStatus, error } = useSelector(selectOrdersList)
  const loading = loadStatus === 'loading'
  const load = () => dispatch(fetchOrders({ status, q, from, to, page, pageSize: PAGE_SIZE }))
  useEffect(() => {
    if (!rangeInvalid) dispatch(fetchOrders({ status, q, from, to, page, pageSize: PAGE_SIZE }))
  }, [dispatch, rangeInvalid, status, q, from, to, page])

  const hasData = meta !== null
  const filtered = !!(status || q || from || to)

  return (
    <>
      <Card>
        <div className="space-y-3 border-b border-slate-200 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
              <Input
                aria-label="Search by order number"
                placeholder="Search by order number, e.g. ORD-000012"
                className="!min-h-9 !py-1 pl-9"
                value={qInput}
                onChange={(e) => {
                  setQInput(e.target.value)
                  update({ q: e.target.value })
                }}
              />
            </div>
            <Link to="/orders/new">
              <Button className="!min-h-9 !py-1">
                <Plus className="h-4 w-4" aria-hidden />
                New order
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status filter">
              {STATUS_CHIPS.map((c) => (
                <Chip key={c.label} active={status === c.value} onClick={() => update({ status: c.value })}>
                  {c.label}
                </Chip>
              ))}
            </div>
            <div className="flex items-center gap-2 lg:ml-auto">
              <DateInputs
                from={from}
                to={to}
                onFrom={(v) => update({ from: v })}
                onTo={(v) => update({ to: v })}
                invalid={rangeInvalid}
                fromLabel="Created from"
                toLabel="Created to"
              />
              {filtered && (
                <button
                  type="button"
                  onClick={() => {
                    setQInput('')
                    setSp({}, { replace: true })
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                  Clear
                </button>
              )}
            </div>
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
          <EmptyState
            title={filtered ? 'No orders match your filters' : 'No orders yet'}
            hint={filtered ? 'Dates are IST days. Try widening the range.' : 'Create an order to reserve stock for a customer.'}
            action={
              filtered ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQInput('')
                    setSp({}, { replace: true })
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Link to="/orders/new">
                  <Button>New order</Button>
                </Link>
              )
            }
          />
        )}
        {hasData && items.length > 0 && (
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Created by</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">
                        <Link to={`/orders/${o.id}`} className="text-brand-700 hover:underline">
                          {o.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {o.itemCount} product{o.itemCount === 1 ? '' : 's'} · {o.unitCount} unit{o.unitCount === 1 ? '' : 's'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{o.createdBy.name}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(o.createdAt)}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{formatMoney(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {items.map((o) => (
                <li key={o.id}>
                  <Link to={`/orders/${o.id}`} className="block space-y-1 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{o.orderNumber}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>{formatDateTime(o.createdAt)}</span>
                      <span className="font-medium tabular-nums text-slate-900">{formatMoney(o.total)}</span>
                    </div>
                  </Link>
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
