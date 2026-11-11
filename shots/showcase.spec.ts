import { expect, test } from '@playwright/test'

// Writes the portfolio screenshots in showcase/. Run with `npm run screenshots`.
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 834, height: 1194 },
] as const

const screens = [
  { path: 'orders', ready: 'section.column--new article' },
  { path: 'menu', ready: '[data-item]' },
  { path: 'sales', ready: '.top-item' },
  { path: 'staff', ready: '[data-member]' },
] as const

for (const viewport of viewports) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 2 })

    for (const screen of screens) {
      test(screen.path, async ({ page }) => {
        await page.goto(`${screen.path}?latency=0`)
        await expect(page.locator(screen.ready).first()).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
        await page.screenshot({ path: `showcase/${screen.path}-${viewport.name}.png`, animations: 'disabled' })
      })
    }

    test('orders with an undo toast', async ({ page }) => {
      await page.goto('orders?latency=0')
      await page.getByRole('article', { name: 'Order 1043, Table 2' }).getByRole('button', { name: 'Start' }).click()
      await expect(page.getByTestId('toast')).toBeVisible()
      await page.mouse.move(0, 0)
      await page.screenshot({ path: `showcase/orders-undo-${viewport.name}.png`, animations: 'disabled' })
    })
  })
}
