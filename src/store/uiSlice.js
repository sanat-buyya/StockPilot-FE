import { createSlice, nanoid } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: { toasts: [] },
  reducers: {
    toastAdded(state, action) {
      state.toasts.push(action.payload)
    },
    toastRemoved(state, action) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
  },
})

export const { toastAdded, toastRemoved } = uiSlice.actions
export default uiSlice.reducer

/** Plain thunk (function action): shows a toast and removes it again after 5 s. */
export const showToast = (kind, text) => (dispatch) => {
  const id = nanoid()
  dispatch(toastAdded({ id, kind, text }))
  setTimeout(() => dispatch(toastRemoved(id)), 5000)
}
