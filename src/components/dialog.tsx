import { useEffect, useId, useRef, type ReactNode } from 'react'

/**
 * Native <dialog> opened with showModal(): the browser traps focus, closes on Esc and
 * returns focus to the opener, so no extra library is needed.
 */
export function Dialog({
  open,
  title,
  onClose,
  children,
  size = 'md',
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md'
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // React's autoFocus runs before showModal(), so dialogs mark their first field with data-autofocus.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`dialog dialog--${size}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      {open && (
        <>
          <header className="dialog__header">
            <h2 id={titleId} className="dialog__title">
              {title}
            </h2>
            <button type="button" className="btn btn--ghost btn--icon" aria-label="Close" onClick={onClose}>
              ×
            </button>
          </header>
          {children}
        </>
      )}
    </dialog>
  )
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog open={open} title={title} onClose={onCancel} size="sm">
      <div className="dialog__body">{body}</div>
      <footer className="dialog__footer">
        <button type="button" className="btn btn--secondary" onClick={onCancel} data-autofocus>
          Cancel
        </button>
        <button type="button" className="btn btn--danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </footer>
    </Dialog>
  )
}
