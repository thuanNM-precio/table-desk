// Shapes exchanged with the REST API. Money is always an integer in minor units
// (centavos), timestamps are ISO-8601 strings. See docs/api.md.

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'completed'
export type OrderChannel = 'dine-in' | 'takeaway' | 'delivery'

export interface OrderLine {
  menuItemId: string
  name: string
  quantity: number
  unitPrice: number
  note?: string
}

export interface Order {
  id: string
  number: number
  channel: OrderChannel
  /** Table label for dine-in, customer or rider reference otherwise. */
  reference: string
  lines: OrderLine[]
  total: number
  status: OrderStatus
  placedAt: string
  updatedAt: string
}

export interface MenuCategory {
  id: string
  name: string
}

export interface MenuItem {
  id: string
  name: string
  description: string
  categoryId: string
  price: number
  available: boolean
}

export type MenuItemInput = Omit<MenuItem, 'id'>

export type StaffRole = 'owner' | 'manager' | 'cashier' | 'server' | 'kitchen'
export type StaffStatus = 'active' | 'invited' | 'deactivated'

export interface StaffMember {
  id: string
  name: string
  email: string
  role: StaffRole
  status: StaffStatus
  lastActiveAt: string | null
}

export interface StaffInvite {
  name: string
  email: string
  role: Exclude<StaffRole, 'owner'>
}

export type StaffUpdate = Partial<Pick<StaffMember, 'role' | 'status'>>

export type SalesRange = 'today' | '7d'

export interface SalesPoint {
  label: string
  revenue: number
}

export interface TopItem {
  menuItemId: string
  name: string
  quantity: number
  revenue: number
}

export interface SalesTotals {
  revenue: number
  orders: number
  averageTicket: number
}

export interface SalesSummary extends SalesTotals {
  range: SalesRange
  previous: SalesTotals
  series: SalesPoint[]
  topItems: TopItem[]
}

/** Error body returned by the API for any 4xx/5xx response. */
export interface ApiErrorBody {
  message: string
  fieldErrors?: Record<string, string>
}
