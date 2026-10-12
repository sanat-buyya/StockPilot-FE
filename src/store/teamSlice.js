import { createSlice, isAnyOf } from '@reduxjs/toolkit'
import { del, get, patch, post } from '../api/client'
import { createWorkspace, logout, selectWorkspace } from './authSlice'
import { apiThunk, wsPath } from './thunkUtils'

export const fetchMembers = apiThunk('team/fetch', (_, { getState }) => get(`${wsPath(getState)}/members`))

export const addMember = apiThunk('team/add', ({ email, role }, { getState }) => post(`${wsPath(getState)}/members`, { email, role }))

export const changeMemberRole = apiThunk('team/changeRole', ({ userId, role }, { getState }) =>
  patch(`${wsPath(getState)}/members/${userId}`, { role }),
)

export const removeMember = apiThunk('team/remove', async (userId, { getState }) => {
  await del(`${wsPath(getState)}/members/${userId}`)
  return userId
})

const initialState = { items: [], status: 'idle', error: null }

const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMembers.pending, (s) => {
        s.status = 'loading'
        s.error = null
      })
      .addCase(fetchMembers.fulfilled, (s, a) => {
        s.status = 'succeeded'
        s.items = a.payload
      })
      .addCase(fetchMembers.rejected, (s, a) => {
        s.status = 'failed'
        s.error = a.payload?.message ?? 'Something went wrong'
      })
      .addCase(addMember.fulfilled, (s, a) => {
        s.items.push(a.payload)
      })
      .addCase(changeMemberRole.fulfilled, (s, a) => {
        s.items = s.items.map((m) => (m.userId === a.payload.userId ? a.payload : m))
      })
      .addCase(removeMember.fulfilled, (s, a) => {
        s.items = s.items.filter((m) => m.userId !== a.payload)
      })
      .addMatcher(isAnyOf(selectWorkspace, logout, createWorkspace.fulfilled), () => initialState)
  },
})

export default teamSlice.reducer
export const selectTeam = (s) => s.team
