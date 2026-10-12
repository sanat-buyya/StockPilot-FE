import { ArrowLeft, Ban, CheckCheck, CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, get, post } from '../api/client'
import { useWs } from '../auth/AuthContext'
import { Button, Card, ConfirmDialog, ErrorBanner, Spinner, StatusBadge, useToast } from '../components/ui'
import { formatDateTime, formatMoney } from '../lib/format'
import { useAsync } from '../lib/hooks'
export default function OrderDetailPage() {
  const { id } = useParams()
  const ws = useWs()
  const toast = useToast()
  const [pending, setPending] = useState(null)
  const { data: o, loading, error, reload } = useAsync(() => get(`${ws}/orders/${id}`), [ws, id])
  async function run(action) {
    try {
      await post(`${ws}/orders/${id}/${action}`)
      toast(
        'success',
        { confirm: 'Order confirmed', complete: 'Order completed', cancel: 'Order cancelled — reserved stock returned' }[action],
      )
    } catch (err) {
      toast('error', err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setPending(null)
      reload() // always re-read: the order may have changed elsewhere
    }
  }
  if (loading && !o) return <Spinner />
  if (error || !o) {
    return (
      <>
        <Link to="/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Orders
        </Link>
        <ErrorBanner message={error ?? 'Order not found'} onRetry={reload} />
      </>
    )
  }
  const canConfirm = o.status === 'pending'
  const canComplete = o.status === 'confirmed'
  const canCancel = o.status === 'pending' || o.status === 'confirmed'
  const timeline = [
    ['Created', o.createdAt],
    ['Confirmed', o.confirmedAt],
    ['Completed', o.completedAt],
    ['Cancelled', o.cancelledAt],
  ]
  return (
    <>
      <Link to="/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Orders
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{o.orderNumber}</h1>
            <StatusBadge status={o.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Created by {o.createdBy.name} on {formatDateTime(o.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canConfirm && (
            <Button onClick={() => setPending('confirm')}>
              <CircleCheck className="h-4 w-4" aria-hidden />
              Confirm
            </Button>
          )}
          {canComplete && (
            <Button onClick={() => setPending('complete')}>
              <CheckCheck className="h-4 w-4" aria-hidden />
              Mark completed
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" onClick={() => setPending('cancel')}>
              <Ban className="h-4 w-4" aria-hidden />
              Cancel order
            </Button>
          )}
        </div>
      </div>

      {o.status === 'cancelled' && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-100 p-3 text-sm text-slate-700">
          This order was cancelled{o.stockReleasedAt ? ` and its reserved stock was returned on ${formatDateTime(o.stockReleasedAt)}` : ''}.
        </div>
      )}
      {(o.status === 'pending' || o.status === 'confirmed') && (
        <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          Stock for these items is reserved. Cancelling returns it to inventory.
        </div>
      )}

      <Card>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right">Unit price</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {o.items.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3 font-medium">
                    <Link to={`/products/${i.productId}`} className="hover:underline">
                      {i.productName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{i.productSku}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(i.unitPrice)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{i.quantity}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(i.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="divide-y divide-slate-100 md:hidden">
          {o.items.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-3 p-4 text-sm">
              <div>
                <div className="font-medium">{i.productName}</div>
                <div className="text-xs text-slate-500">
                  {i.productSku} · {i.quantity} × {formatMoney(i.unitPrice)}
                </div>
              </div>
              <div className="font-medium tabular-nums">{formatMoney(i.lineTotal)}</div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <span className="text-sm text-slate-500">Prices are those at the time the order was placed</span>
          <span className="text-lg font-semibold tabular-nums">Total {formatMoney(o.total)}</span>
        </div>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Timeline</h2>
          <ul className="space-y-2 text-sm">
            {timeline
              .filter(([, t]) => t)
              .map(([label, t]) => (
                <li key={label} className="flex justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span>{formatDateTime(t)}</span>
                </li>
              ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Notes</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600">{o.notes || 'No notes.'}</p>
        </Card>
      </div>

      {pending === 'confirm' && (
        <ConfirmDialog
          title="Confirm this order?"
          confirmLabel="Confirm order"
          onClose={() => setPending(null)}
          onConfirm={() => run('confirm')}
          message="The order moves to Confirmed. Stock is already reserved, so inventory does not change."
        />
      )}
      {pending === 'complete' && (
        <ConfirmDialog
          title="Mark order as completed?"
          confirmLabel="Mark completed"
          onClose={() => setPending(null)}
          onConfirm={() => run('complete')}
          message="The order is final. The stock deduction stays in place and the order can no longer be cancelled."
        />
      )}
      {pending === 'cancel' && (
        <ConfirmDialog
          danger
          title="Cancel this order?"
          confirmLabel="Cancel order"
          onClose={() => setPending(null)}
          onConfirm={() => run('cancel')}
          message="The reserved stock for every item will be returned to inventory (once). This cannot be undone."
        />
      )}
    </>
  )
}
