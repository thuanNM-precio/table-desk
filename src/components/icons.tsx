import type { SVGProps } from 'react'

// Minimal stroke icons (24px grid, 1.75 stroke) so the bundle has no icon library.
function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  )
}

export const OrdersIcon = () => (
  <Icon>
    <path d="M7 3h10a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1Z" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </Icon>
)

export const MenuIcon = () => (
  <Icon>
    <path d="M4 5h16M4 12h16M4 19h10" />
  </Icon>
)

export const SalesIcon = () => (
  <Icon>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Icon>
)

export const StaffIcon = () => (
  <Icon>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5A6.5 6.5 0 0 1 21.5 20" />
  </Icon>
)

export const SearchIcon = () => (
  <Icon width="16" height="16">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Icon>
)

export const PlusIcon = () => (
  <Icon width="16" height="16">
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const ArrowIcon = () => (
  <Icon width="16" height="16">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
)

export const KeyboardIcon = () => (
  <Icon width="16" height="16">
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
  </Icon>
)
