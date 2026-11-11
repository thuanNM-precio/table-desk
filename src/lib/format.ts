// Formatting in one place so currency and locale can change with one edit.
export const LOCALE = 'en-PH'
export const CURRENCY = 'PHP'

const moneyExact = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2 })
const moneyWhole = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 })
const moneyCompact = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, notation: 'compact', maximumFractionDigits: 1 })
const integer = new Intl.NumberFormat(LOCALE)
const percent = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 0 })
const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })

/** Minor units (centavos) to "₱1,250.00". */
export const formatMoney = (minor: number) => moneyExact.format(minor / 100)
export const formatMoneyWhole = (minor: number) => moneyWhole.format(minor / 100)
export const formatMoneyCompact = (minor: number) => moneyCompact.format(minor / 100)
export const formatInteger = (value: number) => integer.format(value)
export const formatPercent = (ratio: number) => percent.format(ratio)

/** Price input value from centavos: 18000 -> "180", 18050 -> "180.50". */
export const priceToInput = (minor: number) => (minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2))

export function minutesSince(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000))
}

export function formatLastActive(iso: string | null, now: number): string {
  if (!iso) return 'Never signed in'
  const minutes = minutesSince(iso, now)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return relative.format(-minutes, 'minute')
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return relative.format(-hours, 'hour')
  return relative.format(-Math.floor(hours / 24), 'day')
}
