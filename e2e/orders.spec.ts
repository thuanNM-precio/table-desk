import { expect, test, type Page } from '@playwright/test'

const column = (page: Page, status: 'new' | 'preparing' | 'ready' | 'completed') => page.locator(`section.column--${status}`)
const ticket = (page: Page, name: string) => page.getByRole('article', { name })

test.describe('Orders', () => {
  test('advances a ticket with one click, then undoes it', async ({ page }) => {
    await page.goto('orders?latency=0')
    const order = ticket(page, 'Order 1043, Table 2')
    await expect(column(page, 'new').getByRole('article', { name: 'Order 1043, Table 2' })).toBeVisible()

    await order.getByRole('button', { name: 'Start' }).click()
    await expect(column(page, 'preparing').getByRole('article', { name: 'Order 1043, Table 2' })).toBeVisible()
    const toast = page.getByTestId('toast').filter({ hasText: '#1043 moved to Preparing' })
    await expect(toast).toBeVisible()

    await toast.getByRole('button', { name: 'Undo' }).click()
    await expect(column(page, 'new').getByRole('article', { name: 'Order 1043, Table 2' })).toBeVisible()
  })

  test('works from the keyboard: J to pick a ticket, Enter to advance', async ({ page }) => {
    await page.goto('orders?latency=0')
    await expect(column(page, 'new').getByRole('article')).toHaveCount(4)

    await page.keyboard.press('j')
    await expect(ticket(page, 'Order 1043, Table 2').getByRole('button', { name: 'Start' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(column(page, 'preparing').getByRole('article', { name: 'Order 1043, Table 2' })).toBeVisible()
    // Focus stays in the New column so the next Enter keeps working.
    await expect(ticket(page, 'Order 1044, Pickup: Marco').getByRole('button', { name: 'Start' })).toBeFocused()

    // G then S navigates to Sales.
    await page.keyboard.press('g')
    await page.keyboard.press('s')
    await expect(page).toHaveURL(/\/table-desk\/sales/)
  })

  test('filters by search and channel', async ({ page }) => {
    await page.goto('orders?latency=0')
    await expect(page.getByRole('article').first()).toBeVisible()
    await page.keyboard.press('/')
    await expect(page.getByPlaceholder('Order #, table or dish')).toBeFocused()
    await page.keyboard.type('sinigang')
    await expect(page.getByRole('article')).toHaveCount(2)

    await page.getByRole('button', { name: 'Clear filters' }).first().click()
    await page.getByRole('group', { name: 'Channel' }).getByRole('button', { name: 'Delivery' }).click()
    await expect(page.getByRole('article')).toHaveCount(3)
    await expect(page).toHaveURL(/channel=delivery/)
  })

  test('rolls back an optimistic move when the API fails, then retries', async ({ page }) => {
    await page.goto('orders?fail=order-status&latency=300')
    await ticket(page, 'Order 1043, Table 2').getByRole('button', { name: 'Start' }).click()
    // Moves straight away (optimistic)...
    await expect(column(page, 'preparing').getByRole('article', { name: 'Order 1043, Table 2' })).toBeVisible()
    // ...and returns when the server says no.
    const toast = page.getByTestId('toast').filter({ hasText: '#1043 is back in New' })
    await expect(toast).toBeVisible()
    await expect(column(page, 'new').getByRole('article', { name: 'Order 1043, Table 2' })).toBeVisible()

    await toast.getByRole('button', { name: 'Retry' }).click()
    await expect(column(page, 'preparing').getByRole('article', { name: 'Order 1043, Table 2' })).toBeVisible()
    await expect(page.getByTestId('toast').filter({ hasText: '#1043 moved to Preparing' })).toBeVisible()
  })
})
