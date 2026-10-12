import { AlertTriangle, CalendarDays, IndianRupee, Package, ShoppingCart, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Card, EmptyState, ErrorBanner, Input, Spinner, StatusBadge } from '../components/ui'
import { REASON_LABELS, formatDateTime, formatDay, formatMoney, monthStart, shiftDate, signed, todayIst } from '../lib/format'
import { fetchDashboard, selectDashboard } from '../store/dashboardSlice'

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled']
const RECENT_LIMIT = 5 // both "recent" lists show only the latest five

function Stat({ icon, label, value, to, tone = 'slate', note }) {
  const body = (
    <Card className={`h-full p-4 ${to ? 'transition hover:border-brand-500' : ''}`}>
      <div className={`mb-2 flex items-center gap-2 text-sm ${tone === 'red' ? 'text-red-600' : 'text-slate-500'}`}>
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </Card>
  )
  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  )
}

export default function DashboardPage() {
  const dispatch = useDispatch()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { item: data, status, error } = useSelector(selectDashboard)
  const loading = status === 'loading'
  const rangeInvalid = !!from && !!to && to < from

  // Quick ranges (IST calendar days). "Last 30 days" is the server default, so it sends no dates.
  const today = todayIst()
  const presets = [
    { label: 'Today', from: today, to: today },
    { label: 'Last 7 days', from: shiftDate(today, -6), to: today },
    { label: 'Last 30 days', from: '', to: '' },
    { label: 'This month', from: monthStart(today), to: today },
  ]
  const isActive = (p) => p.from === from && p.to === to

  useEffect(() => {
    if (!rangeInvalid) dispatch(fetchDashboard({ from, to }))
  }, [dispatch, from, to, rangeInvalid])

  return (
    <>
      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <CalendarDays className="h-4 w-4 text-slate-500" aria-hidden />
            Period
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick ranges">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setFrom(p.from)
                  setTo(p.to)
                }}
                aria-pressed={isActive(p)}
                className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset transition-colors ${
                  isActive(p) ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <Input
              aria-label="From date"
              type="date"
              className="!min-h-9 !w-40 !py-1"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
            />
            <span className="text-slate-400" aria-hidden>
              –
            </span>
            <Input
              aria-label="To date"
              type="date"
              className="!min-h-9 !w-40 !py-1"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              invalid={rangeInvalid}
            />
            {(from || to) && (
              <button
                type="button"
                onClick={() => {
                  setFrom('')
                  setTo('')
                }}
                aria-label="Clear dates"
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <p
          className={`mt-2 text-xs ${rangeInvalid ? 'font-medium text-red-600' : 'text-slate-500'}`}
          role={rangeInvalid ? 'alert' : undefined}
        >
          {rangeInvalid
            ? '"To" date is before "From" date.'
            : data
              ? `Showing orders created ${formatDay(data.from)} – ${formatDay(data.to)}`
              : ' '}
        </p>
      </Card>

      {error && <ErrorBanner message={error} onRetry={() => dispatch(fetchDashboard({ from, to }))} />}
      {loading && !data && <Spinner />}
      {data && !rangeInvalid && (
        <div className={loading ? 'opacity-60 transition-opacity' : ''}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={<Package className="h-4 w-4" />} label="Active products" value={data.activeProducts} to="/products" />
            <Stat
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Low stock"
              tone={data.lowStockProducts > 0 ? 'red' : 'slate'}
              value={data.lowStockProducts}
              to="/products?lowStock=true"
              note="Active products at or below their threshold"
            />
            <Stat
              icon={<IndianRupee className="h-4 w-4" />}
              label="Order value"
              value={formatMoney(data.orderValue)}
              note="Pending + confirmed + completed. Cancelled orders excluded."
            />
            <Stat
              icon={<ShoppingCart className="h-4 w-4" />}
              label="Orders in range"
              value={STATUSES.reduce((n, s) => n + data.ordersByStatus[s], 0)}
              to="/orders"
            />
          </div>

          <Card className="mt-4 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Orders by status</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STATUSES.map((s) => (
                <Link key={s} to={`/orders?status=${s}`} className="rounded-lg border border-slate-200 p-3 hover:border-brand-500">
                  <StatusBadge status={s} />
                  <div className="mt-2 text-xl font-semibold tabular-nums">{data.ordersByStatus[s]}</div>
                  <div className="text-xs text-slate-500">{formatMoney(data.valueByStatus[s])}</div>
                </Link>
              ))}
            </div>
          </Card>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-700">Recent orders</h2>
                <Link to="/orders" className="text-xs font-medium text-brand-600 hover:underline">
                  View all
                </Link>
              </div>
              {data.recentOrders.length === 0 ? (
                <EmptyState
                  title="No orders yet"
                  hint="Create the first order to see it here."
                  action={
                    <Link to="/orders/new" className="text-sm font-medium text-brand-600 hover:underline">
                      New order
                    </Link>
                  }
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recentOrders.slice(0, RECENT_LIMIT).map((o) => (
                    <li key={o.id}>
                      <Link to={`/orders/${o.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                        <div className="min-w-0">
                          <div className="font-medium">{o.orderNumber}</div>
                          <div className="truncate text-xs text-slate-500">
                            {o.createdBy.name} · {formatDateTime(o.createdAt)}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <StatusBadge status={o.status} />
                          <span className="w-24 text-right tabular-nums">{formatMoney(o.total)}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-700">Recent stock changes</h2>
                <Link to="/inventory" className="text-xs font-medium text-brand-600 hover:underline">
                  Full history
                </Link>
              </div>
              {data.recentAdjustments.length === 0 ? (
                <EmptyState title="No stock changes yet" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recentAdjustments.slice(0, RECENT_LIMIT).map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <Link to={`/products/${a.productId}`} className="block truncate font-medium hover:underline">
                          {a.productName}
                        </Link>
                        <div className="truncate text-xs text-slate-500">
                          {REASON_LABELS[a.reasonType] ?? a.reasonType} · {a.createdBy.name} · {formatDateTime(a.createdAt)}
                        </div>
                      </div>
                      <div className="shrink-0 text-right tabular-nums">
                        <div className={a.quantityChange < 0 ? 'font-semibold text-red-600' : 'font-semibold text-emerald-600'}>
                          {signed(a.quantityChange)}
                        </div>
                        <div className="text-xs text-slate-500">→ {a.resultingStock}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
