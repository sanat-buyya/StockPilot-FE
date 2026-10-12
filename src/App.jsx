import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import { Spinner } from './components/ui'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import OrderDetailPage from './pages/OrderDetailPage'
import OrderNewPage from './pages/OrderNewPage'
import OrdersPage from './pages/OrdersPage'
import ProductDetailPage from './pages/ProductDetailPage'
import ProductsPage from './pages/ProductsPage'
import TeamPage from './pages/TeamPage'
function Protected() {
  const { ready, user } = useAuth()
  if (!ready) return <Spinner label="Loading your workspace…" />
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
function OwnerOnly() {
  const { isOwner } = useAuth()
  return isOwner ? <Outlet /> : <Navigate to="/" replace />
}
export default function App() {
  const { ready } = useAuth()
  if (!ready) return <Spinner label="Loading…" />
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Protected />}>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/new" element={<OrderNewPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route element={<OwnerOnly />}>
            <Route path="team" element={<TeamPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
