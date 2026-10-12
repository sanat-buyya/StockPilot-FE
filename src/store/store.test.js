import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, http, setUnauthorizedHandler, tokenStore } from '../api/client'
import { logout, selectWorkspace } from './authSlice'
import { makeStore } from './index'
import { createOrder, fetchOrders, transitionOrder } from './ordersSlice'
import { fetchProducts } from './productsSlice'

/** Replaces the network with a function (config) => { status, data }. Non-2xx statuses reject like real axios. */
function fakeServer(handler) {
  const calls = []
  http.defaults.adapter = async (config) => {
    calls.push(config)
    const { status = 200, data } = await handler(config)
    const response = { status, statusText: String(status), data, headers: {}, config }
    if (status >= 400) throw new AxiosError(`HTTP ${status}`, 'ERR_BAD_REQUEST', config, null, response)
    return response
  }
  return calls
}

/** Node's experimental global localStorage can shadow jsdom's; use a plain in-memory one for deterministic tests. */
function memoryStorage() {
  const m = new Map()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
  }
}

let store
beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  store = makeStore()
  store.dispatch(selectWorkspace('ws1'))
  tokenStore.clear()
  setUnauthorizedHandler(() => {})
})

describe('axios client', () => {
  it('sends the bearer token and strips empty query params', async () => {
    tokenStore.set('tok123')
    const calls = fakeServer(() => ({ data: { data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 } } }))
    await store.dispatch(fetchProducts({ q: '', active: '', lowStock: 'true', page: 1 }))
    expect(calls[0].headers.Authorization).toBe('Bearer tok123')
    expect(calls[0].url).toBe('/api/workspaces/ws1/products')
    expect(calls[0].params).toEqual({ lowStock: 'true', page: 1 })
  })

  it('turns API errors into ApiError with field errors', async () => {
    fakeServer(() => ({
      status: 400,
      data: { error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: [{ field: 'sku', message: 'SKU is required' }] } },
    }))
    const err = await http.get('/x').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.fieldErrors).toEqual({ sku: 'SKU is required' })
  })

  it('signs the user out on 401 when a token was sent', async () => {
    tokenStore.set('expired')
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    fakeServer(() => ({ status: 401, data: { error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } } }))
    await http.get('/x').catch(() => {})
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })
})

describe('orders thunks', () => {
  it('createOrder posts items with an Idempotency-Key and never sends totals', async () => {
    const calls = fakeServer(() => ({ status: 201, data: { data: { id: 'o1', orderNumber: 'ORD-000001', status: 'pending' } } }))
    const result = await store.dispatch(
      createOrder({ items: [{ productId: 'p1', quantity: 2 }], notes: undefined, idempotencyKey: 'order-abc12345' }),
    )
    expect(result.type).toBe('orders/create/fulfilled')
    expect(calls[0].headers['Idempotency-Key']).toBe('order-abc12345')
    expect(calls[0].url).toBe('/api/workspaces/ws1/orders')
    expect(JSON.parse(calls[0].data)).toEqual({ items: [{ productId: 'p1', quantity: 2 }] })
  })

  it('a failed createOrder rejects with a serialisable payload carrying code and details', async () => {
    const details = [{ productId: 'p1', requested: 5, available: 1, message: 'Insufficient stock' }]
    fakeServer(() => ({
      status: 409,
      data: { error: { code: 'INSUFFICIENT_STOCK', message: 'Insufficient stock for one or more items', details } },
    }))
    const action = await store.dispatch(createOrder({ items: [{ productId: 'p1', quantity: 5 }], idempotencyKey: 'order-abc12345' }))
    expect(action.type).toBe('orders/create/rejected')
    expect(action.payload.code).toBe('INSUFFICIENT_STOCK')
    expect(action.payload.details).toEqual(details)
    expect(() => JSON.stringify(action.payload)).not.toThrow()
  })

  it('transitionOrder updates the open order in the store', async () => {
    const calls = fakeServer(() => ({ data: { data: { id: 'o1', status: 'cancelled' } } }))
    await store.dispatch(transitionOrder({ id: 'o1', action: 'cancel' }))
    expect(calls[0].url).toBe('/api/workspaces/ws1/orders/o1/cancel')
    expect(store.getState().orders.detail.item.status).toBe('cancelled')
  })
})

describe('list slices', () => {
  it('ignores a response from a superseded request (no out-of-order results)', async () => {
    const releases = []
    fakeServer(
      (config) =>
        new Promise((resolve) =>
          releases.push(() =>
            resolve({ data: { data: [{ id: config.params.q }], meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 } } }),
          ),
        ),
    )
    const first = store.dispatch(fetchProducts({ q: 'old' }))
    const second = store.dispatch(fetchProducts({ q: 'new' }))
    await vi.waitFor(() => expect(releases).toHaveLength(2))
    releases[1]() // newest answers first
    await second
    releases[0]() // the stale one arrives late
    await first
    expect(store.getState().products.list.items).toEqual([{ id: 'new' }])
  })

  it('drops workspace data when another workspace is selected or the user signs out', async () => {
    fakeServer(() => ({ data: { data: [{ id: 'o1' }], meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 } } }))
    await store.dispatch(fetchOrders({}))
    expect(store.getState().orders.list.items).toHaveLength(1)
    store.dispatch(selectWorkspace('ws2'))
    expect(store.getState().orders.list.items).toHaveLength(0)

    await store.dispatch(fetchOrders({}))
    store.dispatch(logout())
    expect(store.getState().orders.list.items).toHaveLength(0)
  })
})
