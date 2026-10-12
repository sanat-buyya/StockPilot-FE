import { Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import ProductForm from '../components/ProductForm'
import { Button, Card, EmptyState, ErrorBanner, Input, PageHeader, Pagination, Select, Spinner, StockBadge } from '../components/ui'
import { formatMoney } from '../lib/format'
import { useDebounced } from '../lib/hooks'
import { fetchProducts, selectProductsList } from '../store/productsSlice'

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
  const load = () => dispatch(fetchProducts({ q, active, lowStock, sort, dir, page, pageSize: 10 }))
  useEffect(() => {
    dispatch(fetchProducts({ q, active, lowStock, sort, dir, page, pageSize: 10 }))
  }, [dispatch, q, active, lowStock, sort, dir, page])

  const hasData = meta !== null
  const filtered = !!(q || active || lowStock)

  return (
    <>
      <PageHeader
        actions={
          isOwner && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              New product
            </Button>
          )
        }
      />

      <Card>
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <Input
              aria-label="Search products"
              placeholder="Search name, SKU, description"
              className="pl-9"
              value={qInput}
              onChange={(e) => {
                setQInput(e.target.value)
                update({ q: e.target.value })
              }}
            />
          </div>
          <Select aria-label="Active filter" value={active} onChange={(e) => update({ active: e.target.value })}>
            <option value="">All products</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </Select>
          <Select aria-label="Stock filter" value={lowStock} onChange={(e) => update({ lowStock: e.target.value })}>
            <option value="">Any stock level</option>
            <option value="true">Low stock</option>
            <option value="false">Healthy stock</option>
          </Select>
          <Select
            aria-label="Sort"
            value={`${sort}:${dir}`}
            onChange={(e) => {
              const [s, d] = e.target.value.split(':')
              update({ sort: s, dir: d })
            }}
          >
            <option value="name:asc">Name A–Z</option>
            <option value="name:desc">Name Z–A</option>
            <option value="stock:asc">Stock: low to high</option>
            <option value="stock:desc">Stock: high to low</option>
            <option value="price:asc">Price: low to high</option>
            <option value="price:desc">Price: high to low</option>
            <option value="created:desc">Newest first</option>
          </Select>
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
