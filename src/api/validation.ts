import type { MenuItemInput, StaffInvite } from './types'

export type FieldErrors<T> = Partial<Record<keyof T, string>>

export const PRICE_MAX = 10_000_00 // ₱10,000.00 in centavos
export const DESCRIPTION_MAX = 140

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Parses a price typed by a person ("180", "180.5", "₱1,250") into centavos, or null. */
export function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[₱,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return Math.round(Number(cleaned) * 100)
}

export function validatePrice(price: number | null): string | undefined {
  if (price === null) return 'Enter a price such as 180 or 180.50.'
  if (price <= 0) return 'Price must be more than ₱0.'
  if (price > PRICE_MAX) return 'Price must be ₱10,000 or less.'
  return undefined
}

/** Shared by the form (instant feedback) and the mock API (server-side check). */
export function validateMenuItem(input: Omit<MenuItemInput, 'price'> & { price: number | null }): FieldErrors<MenuItemInput> {
  const errors: FieldErrors<MenuItemInput> = {}
  const name = input.name.trim()
  if (name.length === 0) errors.name = 'Give the item a name.'
  else if (name.length < 2 || name.length > 60) errors.name = 'Use 2 to 60 characters.'
  if (!input.categoryId) errors.categoryId = 'Pick a category.'
  const priceError = validatePrice(input.price)
  if (priceError) errors.price = priceError
  if (input.description.length > DESCRIPTION_MAX) errors.description = `Keep it under ${DESCRIPTION_MAX} characters.`
  return errors
}

export function validateInvite(input: { name: string; email: string; role: StaffInvite['role'] | '' }): FieldErrors<StaffInvite> {
  const errors: FieldErrors<StaffInvite> = {}
  const name = input.name.trim()
  if (name.length === 0) errors.name = 'Enter their full name.'
  else if (name.length < 2) errors.name = 'Use at least 2 characters.'
  const email = input.email.trim()
  if (email.length === 0) errors.email = 'Enter their work email.'
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter an email like name@restaurant.com.'
  if (!input.role) errors.role = 'Pick a role.'
  return errors
}

/** Server messages win, but a cleared server message never hides a client one. */
export function mergeErrors<T>(client: FieldErrors<T>, server: FieldErrors<T>): FieldErrors<T> {
  const merged: FieldErrors<T> = { ...client }
  for (const key of Object.keys(server) as Array<keyof T>) {
    if (server[key]) merged[key] = server[key]
  }
  return merged
}

export function hasErrors(errors: object): boolean {
  return Object.values(errors).some(Boolean)
}
