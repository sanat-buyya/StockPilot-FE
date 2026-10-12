import { createSlice, isAnyOf } from '@reduxjs/toolkit'
import { get, getPaged, patch, post } from '../api/client'
import { createWorkspace, logout, selectWorkspace } from './authSlice'
import { addItemCases, addListCases, apiThunk, itemState, listState, wsPath } from './thunkUtils'

// ---------- thunks ----------
/** Products page list. params: q, active, lowStock, sort, dir, page, pageSize */
export const fetchProducts = apiThunk('products/fetchList', (params, { getState }) => getPaged(`${wsPath(getState)}/products`, params))

/** Separate list used by pickers (new-order search, stock-history filter) so it never clobbers the products page. */
export const fetchProductOptions = apiThunk('products/fetchOptions', (params, { getState }) =>
  getPaged(`${wsPath(getState)}/products`, params),
)

export const fetchProduct = apiThunk('products/fetchOne', (id, { getState }) => get(`${wsPath(getState)}/products/${id}`))

export const createProduct = apiThunk('products/create', (body, { getState }) => post(`${wsPath(getState)}/products`, body))

export const updateProduct = apiThunk('products/update', ({ id, changes }, { getState }) =>
  patch(`${wsPath(getState)}/products/${id}`, changes),
)

/** Audited stock change. Returns the updated product. */
export const adjustStock = apiThunk('products/adjustStock', ({ id, quantityChange, reasonType, note }, { getState }) =>
  post(`${wsPath(getState)}/products/${id}/adjustments`, { quantityChange, reasonType, note }),
)

// ---------- slice ----------
const initialState = {
  list: listState(),
  options: listState(),
  detail: itemState(),
}

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchProducts, 'list')
    addListCases(builder, fetchProductOptions, 'options')
    addItemCases(builder, fetchProduct, 'detail')
    builder
      .addCase(updateProduct.fulfilled, (s, a) => {
        s.detail.item = a.payload
      })
      .addCase(adjustStock.fulfilled, (s, a) => {
        s.detail.item = a.payload
      })
      // different workspace / signed out: drop everything that belonged to the previous one
      .addMatcher(isAnyOf(selectWorkspace, logout, createWorkspace.fulfilled), () => initialState)
  },
})

export default productsSlice.reducer
export const selectProductsList = (s) => s.products.list
export const selectProductOptions = (s) => s.products.options
export const selectProductDetail = (s) => s.products.detail
