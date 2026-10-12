import { AlertTriangle, Plus, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import ProductForm from '../components/ProductForm'
import { Button, Card, EmptyState, ErrorBanner, Chip, Input, Pagination, Select, Spinner, StockBadge } from '../components/ui'
import { formatMoney } from '../lib/format'
import { useDebounced } from '../lib/hooks'
import { fetchProducts, selectProductsList } from '../store/productsSlice'
import { PAGE_SIZE } from '../lib/constants'

const STATUS_CHIPS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' },
]

export default function ProductsPage() {
  const dispatch = useDispatch()
  const { isOwner } = useAuth()
  const [sp, setSp] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const [qInput, setQInput] = useState(sp.get('q') ?? '')
  const q = useDebounced(qInput)

  const active = sp.get('active') ?? ''
  const lowStock = sp.get('lowStock') ?? ''
  const sort = sp.get('sort') ?? 'name'
  const dir = sp.get('dir') ?? 'asc'
  const page = Number(sp.get('page') ?? 1)

  const update = (changes) => {
    const next = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('page' in changes)) next.delete('page')
    setSp(next, { replace: true })
  }

  const { items, meta, status, error } = useSelector(selectProductsList)
  const loading = status === 'loading'
  const load = () => dispatch(fetchProducts({ q, active, lowStock, sort, dir, page, pageSize: PAGE_SIZE }))
  useEffect(() => {
    dispatch(fetchProducts({ q, active, lowStock, sort, dir, page, pageSize: PAGE_SIZE }))
  }, [dispatch, q, active, lowStock, sort, dir, page])

  const hasData = meta !== null
  const filtered = !!(q || active || lowStock)

  return (
    <>
      <Card>
        <div className="space-y-3 border-b border-slate-200 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
              <Input
                aria-label="Search products"
                placeholder="Search by name, SKU or description"
                className="!min-h-9 !py-1 pl-9"
                value={qInput}
                onChange={(e) => {
                  setQInput(e.target.value)
                  update({ q: e.target.value })
                }}
              />
            </div>
            <Select
              aria-label="Sort"
              className="!min-h-9 !w-52 !py-1"
              value={`${sort}:${dir}`}
              onChange={(e) => {
                const [s, d] = e.target.value.split(':')
                update({ sort: s, dir: d })
              }}
            >
              <option value="name:asc">Sort: Name A–Z</option>
              <option value="name:desc">Sort: Name Z–A</option>
              <option value="stock:asc">Sort: Stock, low to high</option>
              <option value="stock:desc">Sort: Stock, high to low</option>
              <option value="price:asc">Sort: Price, low to high</option>
              <option value="price:desc">Sort: Price, high to low</option>
              <option value="created:desc">Sort: Newest first</option>
            </Select>
            {isOwner && (
              <Button className="!min-h-9 !py-1" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                New product
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status filter">
              {STATUS_CHIPS.map((c) => (
                <Chip key={c.label} active={active === c.value} onClick={() => update({ active: c.value })}>
                  {c.label}
                </Chip>
              ))}
            </div>
            <span className="h-5 w-px bg-slate-200" aria-hidden />
            <Chip active={lowStock === 'true'} onClick={() => update({ lowStock: lowStock === 'true' ? '' : 'true' })}>
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              Low stock
            </Chip>
            {filtered && (
              <button
                type="button"
                onClick={() => {
                  setQInput('')
                  setSp({}, { replace: true })
                }}
                className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4">
            <ErrorBanner message={error} onRetry={load} />
          </div>
        )}
        {loading && !hasData && <Spinner />}
        {hasData && items.length === 0 && (
          <EmptyState
            title={filtered ? 'No products match your filters' : 'No products yet'}
            hint={
              filtered
                ? 'Try clearing the search or filters.'
                : isOwner
                  ? 'Add your first product to start tracking stock.'
                  : 'Ask a workspace owner to add products.'
            }
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
              ) : isOwner ? (
                <Button onClick={() => setCreating(true)}>New product</Button>
              ) : undefined
            }
          />
        )}
        {hasData && items.length > 0 && (
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((p) => (
                    <tr key={p.id} className={`hover:bg-slate-50 ${p.active ? '' : 'text-slate-400'}`}>
                      <td className="px-4 py-3 font-medium">
                        <Link to={`/products/${p.id}`} className="hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatMoney(p.unitPrice)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {p.stockQuantity}
                        <span className="text-xs text-slate-400"> / min {p.lowStockThreshold}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StockBadge low={p.lowStock} active={p.active} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {items.map((p) => (
                <li key={p.id}>
                  <Link to={`/products/${p.id}`} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="font-mono text-xs text-slate-500">
                        {p.sku} · {formatMoney(p.unitPrice)}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-semibold tabular-nums">{p.stockQuantity}</div>
                      <StockBadge low={p.lowStock} active={p.active} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination meta={meta} onPage={(n) => update({ page: String(n) })} />
          </div>
        )}
      </Card>

      {creating && (
        <ProductForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            load()
          }}
        />
      )}
    </>
  )
}
