import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useOrders, useSetOrderStatus } from '../api/queries'
import type { Order, OrderChannel, OrderStatus } from '../api/types'
import { PageHeader } from '../components/app-shell'
import { EmptyState, ErrorState, LoadingState, errorMessage } from '../components/async-state'
import { ArrowIcon, SearchIcon } from '../components/icons'
import { useToast } from '../components/toast'
import { formatMoney, minutesSince } from '../lib/format'
import { useHotkey } from '../lib/hotkeys'
import { useNow } from '../lib/use-now'

const nextStatus: Record<OrderStatus, OrderStatus | null> = {
  new: 'preparing',
  preparing: 'ready',
  ready: 'completed',
  completed: null,
}
const statusLabel: Record<OrderStatus, string> = { new: 'New', preparing: 'Preparing', ready: 'Ready', completed: 'Completed' }
const actionLabel: Record<OrderStatus, string> = { new: 'Start', preparing: 'Mark ready', ready: 'Complete', completed: '' }
const channelLabel: Record<OrderChannel, string> = { 'dine-in': 'Dine-in', takeaway: 'Takeaway', delivery: 'Delivery' }
const channels: Array<OrderChannel | 'all'> = ['all', 'dine-in', 'takeaway', 'delivery']

/** Minutes after which a ticket is flagged amber, then red. */
const WAIT_WARN = 10
const WAIT_LATE = 15

function matchesQuery(order: Order, query: string): boolean {
  if (!query) return true
  const needle = query.toLowerCase().replace(/^#/, '')
  return (
    String(order.number).includes(needle) ||
    order.reference.toLowerCase().includes(needle) ||
    order.lines.some((line) => line.name.toLowerCase().includes(needle))
  )
}

/** Moves keyboard focus between ticket action buttons in reading order (J / K). */
function moveTicketFocus(step: 1 | -1) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-ticket-action]'))
  if (buttons.length === 0) return
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const next = current === -1 ? 0 : Math.min(buttons.length - 1, Math.max(0, current + step))
  buttons[next]?.focus()
}

export function OrdersPage() {
  const orders = useOrders()
  const setStatus = useSetOrderStatus()
  const toast = useToast()
  const now = useNow()
  const [params, setParams] = useSearchParams()

  // The box keeps its own state so fast typing never loses keys; the URL mirrors it for links and reloads.
  const [query, setQuery] = useState(() => params.get('q') ?? '')
  const channelParam = params.get('channel')
  const channel = channels.includes(channelParam as OrderChannel) ? (channelParam as OrderChannel) : 'all'
  const showCompleted = params.get('completed') === '1'
  const onSearch = (value: string) => {
    setQuery(value)
    updateParam('q', value)
  }
  const clearFilters = () => {
    setQuery('')
    setParams({}, { replace: true })
  }
  const filtersActive = query !== '' || channel !== 'all'

  const updateParam = (key: string, value: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value === null || value === '') next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )

  const columns = useMemo(() => {
    const visibleStatuses: OrderStatus[] = showCompleted ? ['new', 'preparing', 'ready', 'completed'] : ['new', 'preparing', 'ready']
    const filtered = (orders.data ?? []).filter(
      (order) => (channel === 'all' || order.channel === channel) && matchesQuery(order, query),
    )
    return visibleStatuses.map((status) => {
      const list = filtered.filter((order) => order.status === status)
      // Oldest first while a ticket is still being worked on; newest first once done.
      list.sort((a, b) =>
        status === 'completed' ? b.updatedAt.localeCompare(a.updatedAt) : a.placedAt.localeCompare(b.placedAt),
      )
      return { status, orders: list }
    })
  },[orders.data, channel, query, showCompleted])

  useHotkey('j', () => moveTicketFocus(1))
  useHotkey('k', () => moveTicketFocus(-1))

  /** Moves an order between columns; failures roll back (in the query hook) and offer Retry. */
  function move(order: Order, from: OrderStatus, to: OrderStatus) {
    // mutateAsync (not mutate + callbacks) so every move gets its own toast, even when the
    // kitchen taps several tickets before the first request returns.
    setStatus.mutateAsync({ id: order.id, status: to }).then(
      () =>
        toast({
          tone: 'success',
          message: `#${order.number} moved to ${statusLabel[to]}`,
          action: { label: 'Undo', onAction: () => setStatus.mutate({ id: order.id, status: from }) },
        }),
      (error: unknown) =>
        toast({
          tone: 'error',
          message: `#${order.number} is back in ${statusLabel[from]}: ${errorMessage(error)}`,
          action: { label: 'Retry', onAction: () => move(order, from, to) },
        }),
    )
  }

  function advance(order: Order) {
    const to = nextStatus[order.status]
    if (!to) return
    const from = order.status

    // Keep keyboard flow: focus moves to the next ticket in the same column.
    const focusWasOnTicket = document.activeElement?.closest('[data-order]') !== null
    const column = columns.find((c) => c.status === from)?.orders ?? []
    const index = column.findIndex((o) => o.id === order.id)
    const focusTarget = column[index + 1] ?? column[index - 1]

    move(order, from, to)

    if (focusWasOnTicket) {
      requestAnimationFrame(() => {
        const target = focusTarget && document.querySelector<HTMLButtonElement>(`[data-ticket-action="${focusTarget.id}"]`)
        ;(target ?? document.querySelector<HTMLButtonElement>('[data-ticket-action]'))?.focus()
      })
    }
  }

  const open = (orders.data ?? []).filter((order) => order.status !== 'completed')
  const oldest = open.reduce<number | null>((max, order) => Math.max(max ?? 0, minutesSince(order.placedAt, now)), null)

  return (
    <div className="page">
      <PageHeader
        title="Orders"
        description={
          orders.data
            ? open.length === 0
              ? 'No open orders right now.'
              : `${open.length} open · oldest waiting ${oldest} min`
            : 'Live queue from the kitchen and front of house.'
        }
      />

      <div className="toolbar" role="search">
        <label className="search">
          <SearchIcon />
          <span className="visually-hidden">Search orders</span>
          <input
            type="search"
            data-search
            placeholder="Order #, table or dish"
            value={query}
            onChange={(event) => onSearch(event.target.value)}
          />
          <kbd aria-hidden="true">/</kbd>
        </label>
        <div className="segmented" role="group" aria-label="Channel">
          {channels.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={channel === value}
              onClick={() => updateParam('channel', value === 'all' ? null : value)}
            >
              {value === 'all' ? 'All' : channelLabel[value]}
            </button>
          ))}
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            role="switch"
            checked={showCompleted}
            onChange={(event) => updateParam('completed', event.target.checked ? '1' : null)}
          />
          <span>Show completed</span>
        </label>
        {filtersActive && (
          <button type="button" className="btn btn--ghost" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {orders.isPending ? (
        <LoadingState label="Loading orders…" rows={5} />
      ) : orders.isError ? (
        <ErrorState title="Couldn't load orders" error={orders.error} onRetry={() => orders.refetch()} retrying={orders.isFetching} />
      ) : columns.every((c) => c.orders.length === 0) ? (
        filtersActive ? (
          <EmptyState
            title="No orders match these filters"
            text={query ? `Nothing found for “${query}”.` : undefined}
            action={
              <button type="button" className="btn btn--secondary" onClick={clearFilters}>
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState title="All caught up" text="New tickets appear here on their own; there is no need to refresh." />
        )
      ) : (
        <div className="board" style={{ ['--columns' as string]: columns.length }}>
          {columns.map((column) => (
            <section key={column.status} className={`column column--${column.status}`} aria-labelledby={`col-${column.status}`}>
              <h2 id={`col-${column.status}`} className="column__title">
                <span className="status-dot" aria-hidden="true" />
                {statusLabel[column.status]}
                <span className="column__count">{column.orders.length}</span>
              </h2>
              {column.orders.length === 0 ? (
                <p className="column__empty">Nothing here</p>
              ) : (
                <ol className="column__list">
                  {column.orders.map((order) => (
                    <li key={order.id}>
                      <Ticket order={order} now={now} onAdvance={() => advance(order)} />
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function Ticket({ order, now, onAdvance }: { order: Order; now: number; onAdvance: () => void }) {
  const waited = minutesSince(order.placedAt, now)
  const isOpen = order.status !== 'completed'
  const urgency = !isOpen ? '' : waited >= WAIT_LATE ? 'ticket--late' : waited >= WAIT_WARN ? 'ticket--warn' : ''
  const items = order.lines.reduce((sum, line) => sum + line.quantity, 0)

  return (
    <article className={`ticket ${urgency}`} data-order={order.id} aria-label={`Order ${order.number}, ${order.reference}`}>
      <header className="ticket__header">
        <span className="ticket__number">#{order.number}</span>
        <span className="chip">{channelLabel[order.channel]}</span>
        {isOpen && (
          <span className="ticket__timer" title="Minutes since the order was placed">
            {urgency === 'ticket--late' && <span className="visually-hidden">Late: </span>}
            {waited} min
          </span>
        )}
      </header>
      <p className="ticket__reference">{order.reference}</p>
      <ul className="ticket__lines" aria-label={`${items} items`}>
        {order.lines.map((line) => (
          <li key={line.menuItemId}>
            <span className="ticket__qty">{line.quantity}×</span>
            <span>
              {line.name}
              {line.note && <span className="ticket__note">{line.note}</span>}
            </span>
          </li>
        ))}
      </ul>
      <footer className="ticket__footer">
        <span className="ticket__total num">{formatMoney(order.total)}</span>
        {isOpen && (
          <button type="button" className={`btn btn--advance btn--to-${nextStatus[order.status]}`} data-ticket-action={order.id} onClick={onAdvance}>
            {actionLabel[order.status]}
            <ArrowIcon />
          </button>
        )}
      </footer>
    </article>
  )
}
