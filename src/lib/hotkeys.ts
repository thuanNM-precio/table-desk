import { useEffect, useRef } from 'react'

/** Shortcuts never fire while someone types in a field or while a dialog is open. */
export function shortcutsBlocked(event: KeyboardEvent): boolean {
  const target = event.target
  if (target instanceof HTMLElement) {
    if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true
  }
  return document.querySelector('dialog[open]') !== null
}

/**
 * Binds a single-key shortcut (no Ctrl/Alt/Meta) for as long as the component is mounted.
 * `key` is compared case-insensitively against KeyboardEvent.key.
 */
export function useHotkey(key: string, handler: (event: KeyboardEvent) => void, enabled = true) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return
      if (event.key.toLowerCase() !== key.toLowerCase() || shortcutsBlocked(event)) return
      event.preventDefault()
      handlerRef.current(event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [key, enabled])
}
