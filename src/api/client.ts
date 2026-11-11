import type {
  ApiErrorBody,
  MenuCategory,
  MenuItem,
  MenuItemInput,
  Order,
  OrderStatus,
  SalesRange,
  SalesSummary,
  StaffInvite,
  StaffMember,
  StaffUpdate,
} from './types'

const configuredBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')

/** True when no real API is configured and the in-browser mock (MSW) serves requests. */
export const usingMockApi = configuredBase === ''

const apiBase = usingMockApi ? '/api' : configuredBase

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiBase}${path}`, {
      method,
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check the connection and try again.")
  }

  if (response.status === 204) return undefined as T

  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const errorBody = (payload ?? {}) as Partial<ApiErrorBody>
    throw new ApiError(
      response.status,
      errorBody.message ?? `Request failed (${response.status}).`,
      errorBody.fieldErrors ?? {},
    )
  }
  return payload as T
}

export const api = {
  orders: {
    list: () => request<Order[]>('GET', '/orders'),
    setStatus: (id: string, status: OrderStatus) => request<Order>('PATCH', `/orders/${id}`, { status }),
  },
  menu: {
    categories: () => request<MenuCategory[]>('GET', '/menu-categories'),
    items: () => request<MenuItem[]>('GET', '/menu-items'),
    create: (input: MenuItemInput) => request<MenuItem>('POST', '/menu-items', input),
    update: (id: string, patch: Partial<MenuItemInput>) => request<MenuItem>('PATCH', `/menu-items/${id}`, patch),
    remove: (id: string) => request<void>('DELETE', `/menu-items/${id}`),
  },
  sales: {
    summary: (range: SalesRange) => request<SalesSummary>('GET', `/sales/summary?range=${range}`),
  },
  staff: {
    list: () => request<StaffMember[]>('GET', '/staff'),
    invite: (invite: StaffInvite) => request<StaffMember>('POST', '/staff/invitations', invite),
    update: (id: string, patch: StaffUpdate) => request<StaffMember>('PATCH', `/staff/${id}`, patch),
  },
}
