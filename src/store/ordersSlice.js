import { createSlice, isAnyOf } from '@reduxjs/toolkit'
import { get, getPaged, post } from '../api/client'
import { createWorkspace, logout, selectWorkspace } from './authSlice'
import { addItemCases, addListCases, apiThunk, itemState, listState, wsPath } from './thunkUtils'

/** params: status, q, from, to, page, pageSize */
export const fetchOrders = apiThunk('orders/fetchList', (params, { getState }) => getPaged(`${wsPath(getState)}/orders`, params))

export const fetchOrder = apiThunk('orders/fetchOne', (id, { getState }) => get(`${wsPath(getState)}/orders/${id}`))

/**
 * arg: { items: [{productId, quantity}], notes, idempotencyKey }.
 * The key makes a retried submit return the original order instead of reserving stock twice.
 */
export const createOrder = apiThunk('orders/create', ({ items, notes, idempotencyKey }, { getState }) =>
  post(`${wsPath(getState)}/orders`, { items, notes }, { headers: { 'Idempotency-Key': idempotencyKey } }),
)

/** arg: { id, action: 'confirm' | 'complete' | 'cancel' } */
export const transitionOrder = apiThunk('orders/transition', ({ id, action }, { getState }) =>
  post(`${wsPath(getState)}/orders/${id}/${action}`),
)

const initialState = { list: listState(), detail: itemState() }

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchOrders, 'list')
    addItemCases(builder, fetchOrder, 'detail')
    builder
      .addCase(transitionOrder.fulfilled, (s, a) => {
        s.detail.item = a.payload
      })
      .addMatcher(isAnyOf(selectWorkspace, logout, createWorkspace.fulfilled), () => initialState)
  },
})

export default ordersSlice.reducer
export const selectOrdersList = (s) => s.orders.list
export const selectOrderDetail = (s) => s.orders.detail
