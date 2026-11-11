import type { ReactNode } from 'react'
import { ApiError } from '../api/client'

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

export function LoadingState({ label, rows = 4 }: { label: string; rows?: number }) {
  return (
    <div className="state state--loading" role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      <div className="skeleton-list" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="skeleton" style={{ width: `${92 - index * 9}%` }} />
        ))}
      </div>
    </div>
  )
}

export function ErrorState({
  title,
  error,
  onRetry,
  retrying,
}: {
  title: string
  error: unknown
  onRetry: () => void
  retrying: boolean
}) {
  return (
    <div className="state state--error" role="alert">
      <h2 className="state__title">{title}</h2>
      <p className="state__text">{errorMessage(error)}</p>
      <button type="button" className="btn btn--secondary" onClick={onRetry} disabled={retrying}>
        {retrying ? 'Retrying…' : 'Try again'}
      </button>
    </div>
  )
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="state state--empty">
      <h2 className="state__title">{title}</h2>
      {text && <p className="state__text">{text}</p>}
      {action}
    </div>
  )
}
