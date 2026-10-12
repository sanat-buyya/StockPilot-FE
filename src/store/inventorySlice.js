import { createSlice, isAnyOf } from '@reduxjs/toolkit'
import { getPaged } from '../api/client'
import { createWorkspace, logout, selectWorkspace } from './authSlice'
import { addListCases, apiThunk, listState, wsPath } from './thunkUtils'

/** Workspace-wide stock history. params: productId, reasonType, from, to, page, pageSize */
export const fetchAdjustments = apiThunk('inventory/fetchAll', (params, { getState }) =>
  getPaged(`${wsPath(getState)}/inventory/adjustments`, params),
)

/** One product's history. arg: { productId, from, to, page, pageSize } */
export const fetchProductHistory = apiThunk('inventory/fetchForProduct', ({ productId, ...params }, { getState }) =>
  getPaged(`${wsPath(getState)}/products/${productId}/adjustments`, params),
)

const initialState = { list: listState(), productHistory: listState() }

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchAdjustments, 'list')
    addListCases(builder, fetchProductHistory, 'productHistory')
    builder.addMatcher(isAnyOf(selectWorkspace, logout, createWorkspace.fulfilled), () => initialState)
  },
})

export default inventorySlice.reducer
export const selectAdjustments = (s) => s.inventory.list
export const selectProductHistory = (s) => s.inventory.productHistory
