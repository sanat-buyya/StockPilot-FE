import { AlertTriangle, DollarSign, Package, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { get } from '../api/client'
import { useAuth, useWs } from '../auth/AuthContext'
import { Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Spinner, StatusBadge } from '../components/ui'
import { REASON_LABELS, formatDateTime, formatMoney, signed } from '../lib/format'
import { useAsync } from '../lib/hooks'
const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled']
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
  const ws = useWs()
  const { workspace } = useAuth()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { data, loading, error, reload } = useAsync(() => get(`${ws}/dashboard`, { from, to }), [ws, from, to])
  const rangeInvalid = !!from && !!to && to < from
  return (
    <>
      <PageHeader title="Dashboard" subtitle={workspace?.name} />

      <Card className="mb-6 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="From (UTC)" htmlFor="d-from">
            <Input id="d-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To (UTC)" htmlFor="d-to" error={rangeInvalid ? '"To" is before "From"' : undefined}>
            <Input
              id="d-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              invalid={rangeInvalid}
            />
          </Field>
          <p className="pb-2 text-xs text-slate-500">
            {data ? `Showing orders created ${data.from} → ${data.to}.` : ''} Leave empty for the last 30 days.
          </p>
        </div>
      </Card>

      {error && <ErrorBanner message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data && !rangeInvalid && (
        <div className={loading ? 'opacity-60 transition-opacity' : ''}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              icon={<DollarSign className="h-4 w-4" />}
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

          <Card className="mt-6 p-4">
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

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
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
                  {data.recentOrders.map((o) => (
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
                  {data.recentAdjustments.map((a) => (
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
