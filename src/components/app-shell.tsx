import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { usingMockApi } from '../api/client'
import { useOrders } from '../api/queries'
import { shortcutsBlocked } from '../lib/hotkeys'
import { Dialog } from './dialog'
import { KeyboardIcon, MenuIcon, OrdersIcon, SalesIcon, StaffIcon } from './icons'

const destinations = [
  { to: '/orders', label: 'Orders', key: 'o', icon: <OrdersIcon /> },
  { to: '/menu', label: 'Menu', key: 'm', icon: <MenuIcon /> },
  { to: '/sales', label: 'Sales', key: 's', icon: <SalesIcon /> },
  { to: '/staff', label: 'Staff', key: 't', icon: <StaffIcon /> },
] as const

const shortcutGroups: Array<{ title: string; items: Array<[keys: string[], action: string]> }> = [
  {
    title: 'Anywhere',
    items: [
      [['G', 'O'], 'Go to Orders'],
      [['G', 'M'], 'Go to Menu'],
      [['G', 'S'], 'Go to Sales'],
      [['G', 'T'], 'Go to Staff'],
      [['/'], 'Search this page'],
      [['Z'], 'Undo the last change'],
      [['?'], 'Show this list'],
    ],
  },
  {
    title: 'Orders',
    items: [
      [['J'], 'Next ticket'],
      [['K'], 'Previous ticket'],
      [['Enter'], 'Move ticket to the next step'],
    ],
  },
  {
    title: 'Menu and Staff',
    items: [[['N'], 'Add item / invite staff']],
  },
]

function useGlobalShortcuts(openHelp: () => void) {
  const navigate = useNavigate()
  const pendingG = useRef(0)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || shortcutsBlocked(event)) return
      const key = event.key.toLowerCase()
      if (key === '?') {
        event.preventDefault()
        openHelp()
        return
      }
      if (key === '/') {
        const search = document.querySelector<HTMLInputElement>('main [data-search]')
        if (search) {
          event.preventDefault()
          search.focus()
          search.select()
        }
        return
      }
      if (key === 'g') {
        pendingG.current = Date.now()
        return
      }
      if (Date.now() - pendingG.current < 1200) {
        const destination = destinations.find((d) => d.key === key)
        pendingG.current = 0
        if (destination) {
          event.preventDefault()
          navigate(destination.to)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate, openHelp])
}

export function AppShell() {
  const [helpOpen, setHelpOpen] = useState(false)
  useGlobalShortcuts(() => setHelpOpen(true))
  const orders = useOrders()
  const newOrders = orders.data?.filter((order) => order.status === 'new').length ?? 0

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            TD
          </span>
          <span className="brand__text">
            <strong>TableDesk</strong>
            <span>Salt &amp; Ember</span>
          </span>
        </div>
        <nav aria-label="Main">
          <ul className="nav">
            {destinations.map((destination) => (
              <li key={destination.to}>
                <NavLink to={destination.to} className="nav__link">
                  {destination.icon}
                  <span className="nav__label">{destination.label}</span>
                  {destination.to === '/orders' && newOrders > 0 && (
                    <span className="nav__badge" aria-label={`${newOrders} new orders`}>
                      {newOrders}
                    </span>
                  )}
                  <kbd className="nav__kbd" aria-hidden="true">
                    G {destination.key.toUpperCase()}
                  </kbd>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar__footer">
          <button type="button" className="btn btn--ghost sidebar__help" onClick={() => setHelpOpen(true)}>
            <KeyboardIcon />
            <span className="nav__label">Shortcuts</span>
            <kbd aria-hidden="true">?</kbd>
          </button>
          {usingMockApi && (
            <p className="api-badge" title="Requests are answered by the in-browser mock API (MSW). Set VITE_API_BASE_URL to use a real API.">
              <span className="dot" aria-hidden="true" /> <span className="nav__label">Demo API</span>
            </p>
          )}
        </div>
      </aside>
      <main id="main" className="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Dialog open={helpOpen} title="Keyboard shortcuts" onClose={() => setHelpOpen(false)}>
        <div className="dialog__body shortcut-groups">
          {shortcutGroups.map((group) => (
            <section key={group.title}>
              <h3>{group.title}</h3>
              <dl>
                {group.items.map(([keys, action]) => (
                  <div key={action} className="shortcut-row">
                    <dt>{keys.map((k, i) => <Kbd key={i}>{k}</Kbd>)}</dt>
                    <dd>{action}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </Dialog>
    </div>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd>{children}</kbd>
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-header__title">{title}</h1>
        {description && <p className="page-header__description">{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  )
}
