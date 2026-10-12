import { createAsyncThunk } from '@reduxjs/toolkit'
import { ApiError, serializeError } from '../api/client'

/**
 * createAsyncThunk wrapper: any failure becomes a serialisable rejection value
 * ({status, code, message, details, fieldErrors}) that components read from `.unwrap()` errors or slice state.
 */
export const apiThunk = (type, fn) =>
  createAsyncThunk(type, async (arg, thunkApi) => {
    try {
      return await fn(arg, thunkApi)
    } catch (e) {
      return thunkApi.rejectWithValue(serializeError(e))
    }
  })

/** `/api/workspaces/{id}` for the currently selected workspace. Thunks call this so pages never pass ids around. */
export function wsPath(getState) {
  const id = getState().auth.workspaceId
  if (!id) throw new ApiError(0, 'NO_WORKSPACE', 'No workspace selected')
  return `/api/workspaces/${id}`
}

/** Error message from a rejected thunk (action.payload) or a thrown unwrap() value. */
export const messageOf = (e) => e?.message ?? 'Something went wrong. Please try again.'

/**
 * Reducer helpers for a "list" resource: tracks status/error and ignores responses from superseded requests
 * (fast typing/filtering can never show out-of-order results).
 */
export function addListCases(builder, thunk, key) {
  builder
    .addCase(thunk.pending, (s, a) => {
      s[key].status = 'loading'
      s[key].error = null
      s[key].requestId = a.meta.requestId
    })
    .addCase(thunk.fulfilled, (s, a) => {
      if (s[key].requestId !== a.meta.requestId) return
      s[key].status = 'succeeded'
      s[key].items = a.payload.data
      s[key].meta = a.payload.meta
    })
    .addCase(thunk.rejected, (s, a) => {
      if (s[key].requestId !== a.meta.requestId) return
      s[key].status = 'failed'
      s[key].error = a.payload?.message ?? 'Something went wrong'
    })
}

export const listState = () => ({ items: [], meta: null, status: 'idle', error: null, requestId: null })
export const itemState = () => ({ item: null, status: 'idle', error: null, requestId: null })

export function addItemCases(builder, thunk, key) {
  builder
    .addCase(thunk.pending, (s, a) => {
      s[key].status = 'loading'
      s[key].error = null
      s[key].requestId = a.meta.requestId
    })
    .addCase(thunk.fulfilled, (s, a) => {
      if (s[key].requestId !== a.meta.requestId) return
      s[key].status = 'succeeded'
      s[key].item = a.payload
    })
    .addCase(thunk.rejected, (s, a) => {
      if (s[key].requestId !== a.meta.requestId) return
      s[key].status = 'failed'
      s[key].error = a.payload?.message ?? 'Something went wrong'
    })
}
