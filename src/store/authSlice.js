import { createSlice } from '@reduxjs/toolkit'
import { get, post, tokenStore } from '../api/client'
import { apiThunk } from './thunkUtils'

const WS_KEY = 'stockpilot.workspace'
const readWs = () => {
  try {
    return localStorage.getItem(WS_KEY)
  } catch {
    return null
  }
}
const persistWs = (id) => {
  try {
    if (id) localStorage.setItem(WS_KEY, id)
  } catch {
    /* storage unavailable */
  }
}

// ---------- thunks ----------
/** On app start: if a token exists, restore the session from the API. */
export const bootstrapAuth = apiThunk('auth/bootstrap', async () => {
  if (!tokenStore.get()) return null
  return get('/api/auth/me')
})

export const login = apiThunk('auth/login', async ({ email, password }) => {
  const session = await post('/api/auth/login', { email, password }, { skipAuth: true })
  tokenStore.set(session.token)
  return session
})

export const register = apiThunk('auth/register', async (input) => {
  const session = await post('/api/auth/register', input, { skipAuth: true })
  tokenStore.set(session.token)
  return session
})

export const createWorkspace = apiThunk('auth/createWorkspace', async (name) => post('/api/workspaces', { name }))

// ---------- slice ----------
const initialState = {
  ready: false, // false until the first bootstrap attempt has finished
  user: null,
  workspaces: [],
  workspaceId: readWs(),
}

function applySession(state, { user, workspaces }) {
  state.user = user
  state.workspaces = workspaces
  if (!workspaces.some((w) => w.id === state.workspaceId)) state.workspaceId = workspaces[0]?.id ?? null
  persistWs(state.workspaceId)
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      tokenStore.clear()
      state.user = null
      state.workspaces = []
    },
    selectWorkspace(state, action) {
      state.workspaceId = action.payload
      persistWs(action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        if (action.payload) applySession(state, action.payload)
        state.ready = true
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        tokenStore.clear()
        state.ready = true
      })
      .addCase(login.fulfilled, (state, action) => applySession(state, action.payload))
      .addCase(register.fulfilled, (state, action) => applySession(state, action.payload))
      .addCase(createWorkspace.fulfilled, (state, action) => {
        state.workspaces.push(action.payload)
        state.workspaceId = action.payload.id
        persistWs(action.payload.id)
      })
  },
})

export const { logout, selectWorkspace } = authSlice.actions
export default authSlice.reducer

// ---------- selectors ----------
export const selectUser = (s) => s.auth.user
export const selectWorkspaces = (s) => s.auth.workspaces
export const selectCurrentWorkspace = (s) => s.auth.workspaces.find((w) => w.id === s.auth.workspaceId) ?? null
export const selectIsOwner = (s) => selectCurrentWorkspace(s)?.role === 'owner'
