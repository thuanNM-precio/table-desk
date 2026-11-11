import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { api } from './client'
import type { MenuItem, MenuItemInput, Order, OrderStatus, SalesRange, StaffInvite, StaffMember, StaffUpdate } from './types'

export const queryKeys = {
  orders: ['orders'] as const,
  menuCategories: ['menu', 'categories'] as const,
  menuItems: ['menu', 'items'] as const,
  sales: (range: SalesRange) => ['sales', range] as const,
  staff: ['staff'] as const,
}

/**
 * Optimistic edit of one row in a cached list: apply the change at once, roll back
 * to the exact previous list if the request fails, and re-sync with the server after.
 */
function useOptimisticRowMutation<TRow extends { id: string }, TVars extends { id: string }, TResult>(options: {
  queryKey: QueryKey
  mutationFn: (vars: TVars) => Promise<TResult>
  apply: (row: TRow, vars: TVars) => TRow
}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: options.mutationFn,
    onMutate: async (vars: TVars) => {
      await queryClient.cancelQueries({ queryKey: options.queryKey })
      const previous = queryClient.getQueryData<TRow[]>(options.queryKey)
      queryClient.setQueryData<TRow[]>(options.queryKey, (rows) =>
        rows?.map((row) => (row.id === vars.id ? options.apply(row, vars) : row)),
      )
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(options.queryKey, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: options.queryKey }),
  })
}

// Orders ---------------------------------------------------------------------------

export function useOrders() {
  // The kitchen queue refreshes on its own so new tickets appear without a reload.
  return useQuery({ queryKey: queryKeys.orders, queryFn: api.orders.list, refetchInterval: 20_000 })
}

export function useSetOrderStatus() {
  return useOptimisticRowMutation<Order, { id: string; status: OrderStatus }, Order>({
    queryKey: queryKeys.orders,
    mutationFn: ({ id, status }) => api.orders.setStatus(id, status),
    apply: (order, { status }) => ({ ...order, status, updatedAt: new Date().toISOString() }),
  })
}

// Menu -------------------------------------------------------------------------------

export function useMenuCategories() {
  return useQuery({ queryKey: queryKeys.menuCategories, queryFn: api.menu.categories, staleTime: 5 * 60_000 })
}

export function useMenuItems() {
  return useQuery({ queryKey: queryKeys.menuItems, queryFn: api.menu.items })
}

export function useUpdateMenuItem() {
  return useOptimisticRowMutation<MenuItem, { id: string; patch: Partial<MenuItemInput> }, MenuItem>({
    queryKey: queryKeys.menuItems,
    mutationFn: ({ id, patch }) => api.menu.update(id, patch),
    apply: (row, { patch }) => ({ ...row, ...patch }),
  })
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuItemInput) => api.menu.create(input),
    onSuccess: (created) => {
      queryClient.setQueryData<MenuItem[]>(queryKeys.menuItems, (rows) => (rows ? [...rows, created] : rows))
      return queryClient.invalidateQueries({ queryKey: queryKeys.menuItems })
    },
  })
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.menu.remove(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<MenuItem[]>(queryKeys.menuItems, (rows) => rows?.filter((row) => row.id !== id))
      return queryClient.invalidateQueries({ queryKey: queryKeys.menuItems })
    },
  })
}

// Sales --------------------------------------------------------------------------------

export function useSalesSummary(range: SalesRange) {
  return useQuery({ queryKey: queryKeys.sales(range), queryFn: () => api.sales.summary(range), staleTime: 60_000 })
}

// Staff --------------------------------------------------------------------------------

export function useStaff() {
  return useQuery({ queryKey: queryKeys.staff, queryFn: api.staff.list })
}

export function useUpdateStaff() {
  return useOptimisticRowMutation<StaffMember, { id: string; patch: StaffUpdate }, StaffMember>({
    queryKey: queryKeys.staff,
    mutationFn: ({ id, patch }) => api.staff.update(id, patch),
    apply: (row, { patch }) => ({ ...row, ...patch }),
  })
}

export function useInviteStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invite: StaffInvite) => api.staff.invite(invite),
    onSuccess: (member) => {
      queryClient.setQueryData<StaffMember[]>(queryKeys.staff, (rows) => (rows ? [...rows, member] : rows))
      return queryClient.invalidateQueries({ queryKey: queryKeys.staff })
    },
  })
}
