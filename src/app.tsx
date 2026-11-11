import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Link, Navigate, RouterProvider, createBrowserRouter } from 'react-router'
import { AppShell } from './components/app-shell'
import { EmptyState } from './components/async-state'
import { ToastProvider } from './components/toast'
import { MenuPage } from './pages/menu-page'
import { OrdersPage } from './pages/orders-page'
import { SalesPage } from './pages/sales-page'
import { StaffPage } from './pages/staff-page'

const queryClient = new QueryClient({
  defaultOptions: {
    // Fail fast: show the error state with a "Try again" button instead of retrying silently.
    queries: { retry: false, staleTime: 15_000, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
})

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      children: [
        { index: true, element: <Navigate to="/orders" replace /> },
        { path: 'orders', element: <OrdersPage /> },
        { path: 'menu', element: <MenuPage /> },
        { path: 'sales', element: <SalesPage /> },
        { path: 'staff', element: <StaffPage /> },
        {
          path: '*',
          element: (
            <div className="page">
              <EmptyState
                title="Page not found"
                text="That address doesn't match a screen in TableDesk."
                action={
                  <Link className="btn btn--secondary" to="/orders">
                    Go to Orders
                  </Link>
                }
              />
            </div>
          ),
        },
      ],
    },
  ],
  { basename },
)

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  )
}
