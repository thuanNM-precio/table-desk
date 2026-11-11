# TableDesk REST API contract

The dashboard talks to one REST API. Set `VITE_API_BASE_URL` (see `.env.example`)
to point it at a real server; leave it empty and an in-browser mock (MSW, in
`src/mocks/handlers.ts`) answers the same routes under `/api`.

The typed client lives in `src/api/client.ts`; shapes are in `src/api/types.ts`.

## Conventions

- JSON in and out. `Accept: application/json` on every request.
- Money is an **integer in minor units** (centavos): `18000` = ₱180.00.
- Timestamps are ISO-8601 strings.
- Every 4xx/5xx response has this body:

  ```json
  { "message": "Please fix the highlighted fields.", "fieldErrors": { "email": "Someone with this email is already on the team." } }
  ```

  `fieldErrors` is optional; when present, the form shows each message under the
  matching field and focuses the first one.

| Status | Meaning in the UI |
|---|---|
| 0 (network) | "Can't reach the server…" with a retry button |
| 403 | Action not allowed (e.g. changing the owner) – shown as an error toast |
| 422 | Validation failed – `fieldErrors` mapped onto the form |
| 5xx | Error state with "Try again" (reads) or error toast with Retry/rollback (writes) |

## Endpoints

### Orders

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/orders` | – | `Order[]` |
| PATCH | `/orders/:id` | `{ "status": "new" \| "preparing" \| "ready" \| "completed" }` | `Order` |

```ts
Order = { id, number, channel: 'dine-in'|'takeaway'|'delivery', reference, status,
          lines: { menuItemId, name, quantity, unitPrice, note? }[], total, placedAt, updatedAt }
```

The UI updates the ticket optimistically and rolls back if the PATCH fails.

### Menu

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/menu-categories` | – | `{ id, name }[]` |
| GET | `/menu-items` | – | `MenuItem[]` |
| POST | `/menu-items` | `MenuItemInput` | `201 MenuItem` |
| PATCH | `/menu-items/:id` | `Partial<MenuItemInput>` | `MenuItem` |
| DELETE | `/menu-items/:id` | – | `204` |

```ts
MenuItem = { id, name, description, categoryId, price, available }
MenuItemInput = MenuItem without id
```

Validation (client and mock server share `src/api/validation.ts`): name 2–60
characters and unique within its category, category required, price above 0 and at
most ₱10,000, description length capped.

### Sales

| Method | Path | Returns |
|---|---|---|
| GET | `/sales/summary?range=today\|7d` | `SalesSummary` |

```ts
SalesSummary = { range, revenue, orders, averageTicket,
                 previous: { revenue, orders, averageTicket },
                 series: { label, revenue }[],
                 topItems: { menuItemId, name, quantity, revenue }[] }
```

### Staff

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/staff` | – | `StaffMember[]` |
| POST | `/staff/invitations` | `{ name, email, role }` | `201 StaffMember` (status `invited`) |
| PATCH | `/staff/:id` | `{ role?, status?: 'active' \| 'deactivated' }` | `StaffMember` |

```ts
StaffMember = { id, name, email, role: 'owner'|'manager'|'cashier'|'server'|'kitchen',
                status: 'active'|'invited'|'deactivated', lastActiveAt: string | null }
```

The owner can't be changed (`403`); `owner` can't be assigned (`422`); a
duplicate email returns `422` with `fieldErrors.email`.

## Mock-only switches (demo and tests)

Read once from the page URL when the mock is active:

| Parameter | Effect |
|---|---|
| `?latency=0` | No artificial delay (default 250–700 ms per request) |
| `?latency=1500` | Fixed delay, to look at loading states |
| `?fail=<keys>` | The next request in each listed group answers `503`, then recovers |

Failure keys (comma separated): `orders`, `order-status`, `menu`, `menu-write`,
`sales`, `staff`, `staff-write`.

Examples: `/orders?fail=orders` shows the error state and retry;
`/orders?fail=order-status` shows an optimistic move rolling back.

The mock keeps its data in memory; reloading the page restores the seed data.
