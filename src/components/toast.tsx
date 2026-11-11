import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { shortcutsBlocked } from '../lib/hotkeys'

type ToastTone = 'success' | 'error' | 'info'

export interface ToastOptions {
  message: string
  tone?: ToastTone
  /** One action, typically "Undo" or "Retry". Undo can also be triggered with Z. */
  action?: { label: string; onAction: () => void }
}

interface ToastEntry extends ToastOptions {
  id: number
}

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null)

const VISIBLE_MS = 5_000
const VISIBLE_WITH_ACTION_MS = 8_000
const MAX_TOASTS = 3

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((list) => list.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++
      setToasts((list) => [...list, { ...options, id }].slice(-MAX_TOASTS))
      timers.current.set(id, window.setTimeout(() => dismiss(id), options.action ? VISIBLE_WITH_ACTION_MS : VISIBLE_MS))
    },
    [dismiss],
  )

  const runAction = useCallback(
    (toast: ToastEntry) => {
      dismiss(toast.id)
      toast.action?.onAction()
    },
    [dismiss],
  )

  // Z (or Ctrl/Cmd+Z) undoes the most recent action that offered "Undo".
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'z' || event.altKey || event.shiftKey || shortcutsBlocked(event)) return
      const latestUndo = [...toasts].reverse().find((toast) => toast.action?.label === 'Undo')
      if (!latestUndo) return
      event.preventDefault()
      runAction(latestUndo)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toasts, runAction])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => window.clearTimeout(timer))
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone ?? 'info'}`} data-testid="toast">
            <span className="toast__message">{toast.message}</span>
            {toast.action && (
              <button type="button" className="toast__action" onClick={() => runAction(toast)}>
                {toast.action.label}
                {toast.action.label === 'Undo' && <kbd aria-hidden="true">Z</kbd>}
              </button>
            )}
            <button type="button" className="toast__close" aria-label="Dismiss" onClick={() => dismiss(toast.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast must be used inside <ToastProvider>')
  return useMemo(() => show, [show])
}
