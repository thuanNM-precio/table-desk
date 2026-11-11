import { http, HttpResponse } from 'msw/http'
import type {
  ApiErrorBody,
  MenuItem,
  MenuItemInput,
  Order,
  OrderStatus,
  SalesRange,
  SalesSummary,
  SalesTotals,
  StaffInvite,
  StaffMember,
  StaffRole,
  StaffUpdate,
} from '../api/types'
import { hasErrors, validateInvite, validateMenuItem } from '../api/validation'
import { categories, seedMenu, seedOrders, seedStaff, seededRandom } from './seed-data'

// An in-memory REST API that runs in the browser. It follows docs/api.md, so pointing
// VITE_API_BASE_URL at a real server needs no UI change.
//
// Demo switches, read once from the page URL:
//   ?fail=orders            the next GET /orders answers 503 (then recovers), to show error + retry
//   ?fail=order-status      the next PATCH /orders/:id fails, to show optimistic rollback
//   keys: orders, order-status, menu, menu-write, sales, staff, staff-write (comma separated)
//   ?latency=0              no artificial delay (default 250-700 ms)

const pageParams = new URLSearchParams(window.location.search)
const pendingFailures = new Set(
  (pageParams.get('fail') ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean),
)
const fixedLatency = pageParams.has('latency') ? Number(pageParams.get('latency')) : null

const menu: MenuItem[] = seedMenu()
const orders: Order[] = seedOrders(menu)
const staff: StaffMember[] = seedStaff()
let nextId = 1

const errorResponse = (status: number, message: string, fieldErrors?: Record<string, string>) =>
  HttpResponse.json<ApiErrorBody>({ message, ...(fieldErrors ? { fieldErrors } : {}) }, { status })

/** Waits like a real network, then fails once if the page asked for it. */
async function simulate(failureKey: string): Promise<Response | null> {
  const latency = fixedLatency ?? 250 + Math.random() * 450
  await new Promise((resolve) => setTimeout(resolve, latency))
  if (pendingFailures.delete(failureKey)) {
    return errorResponse(503, `The server is temporarily unavailable (simulated with ?fail=${failureKey}).`)
  }
  return null
}

const orderFlow: OrderStatus[] = ['new', 'preparing', 'ready', 'completed']
const staffRoles: StaffRole[] = ['owner', 'manager', 'cashier', 'server', 'kitchen']

function findDuplicateName(input: { name: string; categoryId: string }, exceptId?: string) {
  const name = input.name.trim().toLowerCase()
  return menu.find((m) => m.id !== exceptId && m.categoryId === input.categoryId && m.name.toLowerCase() === name)
}

function salesSummary(range: SalesRange): SalesSummary {
  const random = seededRandom(range === 'today' ? 7 : 42)
  const peso = 100
  let series: SalesSummary['series']
  if (range === 'today') {
    const hourlyShape = [0.4, 0.7, 1.6, 1.8, 0.9, 0.5, 0.5, 0.8, 1.5, 1.9, 1.6, 0.9]
    series = hourlyShape.map((weight, index) => ({
      label: `${String(10 + index).padStart(2, '0')}:00`,
      revenue: Math.round(weight * 6_000 * (0.85 + random() * 0.3)) * peso,
    }))
  } else {
    const weekday = new Intl.DateTimeFormat('en-PH', { weekday: 'short', day: 'numeric' })
    series = Array.from({ length: 7 }, (_, index) => {
      const day = new Date()
      day.setDate(day.getDate() - (6 - index))
      const weekend = day.getDay() === 0 || day.getDay() === 6
      return {
        label: weekday.format(day),
        revenue: Math.round((weekend ? 82_000 : 61_000) * (0.88 + random() * 0.24)) * peso,
      }
    })
  }
  const revenue = series.reduce((sum, point) => sum + point.revenue, 0)
  const totals = (total: number, ticket: number): SalesTotals => {
    const count = Math.round(total / ticket)
    return { revenue: total, orders: count, averageTicket: Math.round(total / count) }
  }
  const current = totals(revenue, 780 * peso)
  const previous = totals(Math.round(revenue * (0.86 + random() * 0.1)), 760 * peso)

  const scale = range === 'today' ? 1 : 7
  const topItems = menu
    .map((m) => {
      const quantity = Math.round((4 + random() * 26) * scale)
      return { menuItemId: m.id, name: m.name, quantity, revenue: quantity * m.price }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  return { range, ...current, previous, series, topItems }
}

export const handlers = [
  http.get('/api/orders', async () => {
    const failure = await simulate('orders')
    if (failure) return failure
    return HttpResponse.json(orders)
  }),

  http.patch<{ id: string }, { status?: OrderStatus }>('/api/orders/:id', async ({ params, request }) => {
    const failure = await simulate('order-status')
    if (failure) return failure
    const order = orders.find((o) => o.id === params.id)
    if (!order) return errorResponse(404, 'That order no longer exists.')
    const { status } = await request.json()
    if (!status || !orderFlow.includes(status)) return errorResponse(422, 'Unknown order status.', { status: 'Unknown status' })
    order.status = status
    order.updatedAt = new Date().toISOString()
    return HttpResponse.json(order)
  }),

  http.get('/api/menu-categories', async () => {
    const failure = await simulate('menu')
    if (failure) return failure
    return HttpResponse.json(categories)
  }),

  http.get('/api/menu-items', async () => {
    const failure = await simulate('menu')
    if (failure) return failure
    return HttpResponse.json(menu)
  }),

  http.post<never, MenuItemInput>('/api/menu-items', async ({ request }) => {
    const failure = await simulate('menu-write')
    if (failure) return failure
    const input = await request.json()
    const fieldErrors: Record<string, string> = { ...validateMenuItem(input) }
    if (!fieldErrors.name && findDuplicateName(input)) fieldErrors.name = 'An item with this name already exists in this category.'
    if (hasErrors(fieldErrors)) return errorResponse(422, 'Please fix the highlighted fields.', fieldErrors)
    const created: MenuItem = { ...input, name: input.name.trim(), description: input.description.trim(), id: `m-new-${nextId++}` }
    menu.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch<{ id: string }, Partial<MenuItemInput>>('/api/menu-items/:id', async ({ params, request }) => {
    const failure = await simulate('menu-write')
    if (failure) return failure
    const existing = menu.find((m) => m.id === params.id)
    if (!existing) return errorResponse(404, 'That menu item no longer exists.')
    const next = { ...existing, ...(await request.json()) }
    const fieldErrors: Record<string, string> = { ...validateMenuItem(next) }
    if (!fieldErrors.name && findDuplicateName(next, existing.id)) fieldErrors.name = 'An item with this name already exists in this category.'
    if (hasErrors(fieldErrors)) return errorResponse(422, 'Please fix the highlighted fields.', fieldErrors)
    Object.assign(existing, next, { name: next.name.trim() })
    return HttpResponse.json(existing)
  }),

  http.delete<{ id: string }>('/api/menu-items/:id', async ({ params }) => {
    const failure = await simulate('menu-write')
    if (failure) return failure
    const index = menu.findIndex((m) => m.id === params.id)
    if (index === -1) return errorResponse(404, 'That menu item no longer exists.')
    menu.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/sales/summary', async ({ request }) => {
    const failure = await simulate('sales')
    if (failure) return failure
    const range = new URL(request.url).searchParams.get('range')
    if (range !== 'today' && range !== '7d') return errorResponse(400, 'range must be "today" or "7d".')
    return HttpResponse.json(salesSummary(range))
  }),

  http.get('/api/staff', async () => {
    const failure = await simulate('staff')
    if (failure) return failure
    return HttpResponse.json(staff)
  }),

  http.post<never, StaffInvite>('/api/staff/invitations', async ({ request }) => {
    const failure = await simulate('staff-write')
    if (failure) return failure
    const input = await request.json()
    const fieldErrors: Record<string, string> = { ...validateInvite(input) }
    if (!fieldErrors.email && staff.some((s) => s.email.toLowerCase() === input.email.trim().toLowerCase())) {
      fieldErrors.email = 'Someone with this email is already on the team.'
    }
    if (hasErrors(fieldErrors)) return errorResponse(422, 'Please fix the highlighted fields.', fieldErrors)
    const member: StaffMember = {
      id: `st-new-${nextId++}`,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      status: 'invited',
      lastActiveAt: null,
    }
    staff.push(member)
    return HttpResponse.json(member, { status: 201 })
  }),

  http.patch<{ id: string }, StaffUpdate>('/api/staff/:id', async ({ params, request }) => {
    const failure = await simulate('staff-write')
    if (failure) return failure
    const member = staff.find((s) => s.id === params.id)
    if (!member) return errorResponse(404, 'That staff member no longer exists.')
    if (member.role === 'owner') return errorResponse(403, "The owner's account can't be changed here.")
    const patch = await request.json()
    if (patch.role && (!staffRoles.includes(patch.role) || patch.role === 'owner')) return errorResponse(422, 'Unknown role.')
    Object.assign(member, patch)
    return HttpResponse.json(member)
  }),
]
