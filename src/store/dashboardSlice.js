import { createSlice, isAnyOf } from '@reduxjs/toolkit'
import { get } from '../api/client'
import { createWorkspace, logout, selectWorkspace } from './authSlice'
import { addItemCases, apiThunk, itemState, wsPath } from './thunkUtils'

/** params: from, to (YYYY-MM-DD, IST). Empty = server default (last 30 days). */
export const fetchDashboard = apiThunk('dashboard/fetch', (params, { getState }) => get(`${wsPath(getState)}/dashboard`, params))

const initialState = { summary: itemState() }

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    addItemCases(builder, fetchDashboard, 'summary')
    builder.addMatcher(isAnyOf(selectWorkspace, logout, createWorkspace.fulfilled), () => initialState)
  },
})

export default dashboardSlice.reducer
export const selectDashboard = (s) => s.dashboard.summary
