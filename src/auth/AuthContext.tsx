import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, get, post, setUnauthorizedHandler, tokenStore } from '../api/client'
import type { Role, Session, User, Workspace } from '../api/types'

interface AuthState {
  ready: boolean
  user: User | null
  workspaces: Workspace[]
  workspace: Workspace | null
  role: Role | null
  isOwner: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: { name: string; email: string; password: string; workspaceName?: string }) => Promise<void>
  logout: () => void
  selectWorkspace: (id: string) => void
  createWorkspace: (name: string) => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)
const WS_KEY = 'stockpilot.workspace'
const readWs = () => { try { return localStorage.getItem(WS_KEY) } catch { return null } }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspaceId, setWorkspaceId] = useState<string | null>(readWs())

  const applySession = useCallback((workspacesIn: Workspace[], u: User) => {
    setUser(u)
    setWorkspaces(workspacesIn)
    setWorkspaceId((cur) => (workspacesIn.some((w) => w.id === cur) ? cur : workspacesIn[0]?.id ?? null))
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    setWorkspaces([])
  }, [])

  useEffect(() => { setUnauthorizedHandler(logout) }, [logout])

  useEffect(() => {
    if (!tokenStore.get()) { setReady(true); return }
    get<{ user: User; workspaces: Workspace[] }>('/api/auth/me')
      .then((me) => applySession(me.workspaces, me.user))
      .catch(() => tokenStore.clear())
      .finally(() => setReady(true))
  }, [applySession])

  useEffect(() => {
    try { if (workspaceId) localStorage.setItem(WS_KEY, workspaceId) } catch { /* storage unavailable */ }
  }, [workspaceId])

  const startSession = useCallback((s: Session) => {
    tokenStore.set(s.token)
    applySession(s.workspaces, s.user)
  }, [applySession])

  const value = useMemo<AuthState>(() => {
    const workspace = workspaces.find((w) => w.id === workspaceId) ?? null
    return {
      ready, user, workspaces, workspace,
      role: workspace?.role ?? null,
      isOwner: workspace?.role === 'owner',
      login: async (email, password) => {
        startSession(await api<{ data: Session }>('POST', '/api/auth/login', { body: { email, password }, auth: false }).then((r) => r.data))
      },
      register: async (input) => {
        startSession(await api<{ data: Session }>('POST', '/api/auth/register', { body: input, auth: false }).then((r) => r.data))
      },
      logout,
      selectWorkspace: setWorkspaceId,
      createWorkspace: async (name) => {
        const w = await post<Workspace>('/api/workspaces', { name })
        setWorkspaces((list) => [...list, w])
        setWorkspaceId(w.id)
      },
    }
  }, [ready, user, workspaces, workspaceId, startSession, logout])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}

/** Base path for the current workspace's API routes. Throws if none is selected. */
export function useWs() {
  const { workspace } = useAuth()
  if (!workspace) throw new Error('No workspace selected')
  return `/api/workspaces/${workspace.id}`
}
