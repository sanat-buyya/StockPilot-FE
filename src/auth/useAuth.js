import { useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  createWorkspace,
  login,
  logout,
  register,
  selectCurrentWorkspace,
  selectIsOwner,
  selectWorkspace,
  selectWorkspaces,
} from '../store/authSlice'

/** Auth/workspace state and actions, backed by the Redux auth slice. Action promises reject with a serialised API error. */
export function useAuth() {
  const dispatch = useDispatch()
  const ready = useSelector((s) => s.auth.ready)
  const user = useSelector((s) => s.auth.user)
  const workspaces = useSelector(selectWorkspaces)
  const workspace = useSelector(selectCurrentWorkspace)
  const isOwner = useSelector(selectIsOwner)

  const actions = useMemo(
    () => ({
      login: (email, password) => dispatch(login({ email, password })).unwrap(),
      register: (input) => dispatch(register(input)).unwrap(),
      logout: () => dispatch(logout()),
      selectWorkspace: (id) => dispatch(selectWorkspace(id)),
      createWorkspace: (name) => dispatch(createWorkspace(name)).unwrap(),
    }),
    [dispatch],
  )

  return { ready, user, workspaces, workspace, role: workspace?.role ?? null, isOwner, ...actions }
}

/** Base path of the current workspace (used only for display/keys; thunks resolve it themselves). */
export function useWorkspaceId() {
  return useSelector((s) => s.auth.workspaceId)
}
