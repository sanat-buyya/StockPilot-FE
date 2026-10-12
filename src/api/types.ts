export type Role = 'owner' | 'staff'
export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
export type ReasonType =
  | 'received' | 'count_correction' | 'damaged' | 'returned' | 'other'
  | 'initial_stock' | 'order_reserve' | 'order_release'

export interface Workspace { id: string; name: string; role: Role }
export interface User { id: string; email: string; name: string }
export interface Session { token: string; user: User; workspaces: Workspace[] }

export interface Product {
  id: string
  name: string
  sku: string
  description?: string
  unitPrice: string
  stockQuantity: number
  lowStockThreshold: number
  lowStock: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Adjustment {
  id: string
  productId: string
  productName: string
  productSku: string
  quantityChange: number
  resultingStock: number
  reasonType: ReasonType
  note?: string
  orderId?: string
  createdBy: { id: string; name: string }
  createdAt: string
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  productSku: string
  unitPrice: string
  quantity: number
  lineTotal: string
}

export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  total: string
  notes?: string
  createdBy: { id: string; name: string }
  itemCount: number
  unitCount: number
  stockReleasedAt?: string
  createdAt: string
  updatedAt: string
  confirmedAt?: string
  completedAt?: string
  cancelledAt?: string
  items: OrderItem[]
}

export interface Member { userId: string; name: string; email: string; role: Role; joinedAt: string }

export interface Dashboard {
  from: string
  to: string
  activeProducts: number
  lowStockProducts: number
  ordersByStatus: Record<OrderStatus, number>
  orderValue: string
  valueByStatus: Record<OrderStatus, string>
  recentOrders: { id: string; orderNumber: string; status: OrderStatus; total: string; createdBy: { id: string; name: string }; createdAt: string }[]
  recentAdjustments: Adjustment[]
}

export interface PageMeta { page: number; pageSize: number; total: number; totalPages: number }
export interface Paged<T> { data: T[]; meta: PageMeta }
