import { configureStore } from '@reduxjs/toolkit'
import { setUnauthorizedHandler } from '../api/client'
import authReducer, { logout } from './authSlice'
import dashboardReducer from './dashboardSlice'
import inventoryReducer from './inventorySlice'
import ordersReducer from './ordersSlice'
import productsReducer from './productsSlice'
import teamReducer from './teamSlice'
import uiReducer from './uiSlice'

export const reducer = {
  auth: authReducer,
  ui: uiReducer,
  dashboard: dashboardReducer,
  products: productsReducer,
  inventory: inventoryReducer,
  orders: ordersReducer,
  team: teamReducer,
}

export const makeStore = () => configureStore({ reducer })

export const store = makeStore()

// A 401 from any request (expired/invalid token) signs the user out.
setUnauthorizedHandler(() => store.dispatch(logout()))
