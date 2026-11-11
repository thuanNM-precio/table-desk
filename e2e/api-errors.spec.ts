import { expect, test } from '@playwright/test'

test.describe('API errors', () => {
  test('shows a loading state, then an error with a working "Try again"', async ({ page }) => {
    await page.goto('orders?fail=orders&latency=400')
    await expect(page.getByRole('status').filter({ hasText: 'Loading orders' })).toBeAttached()

    const error = page.getByRole('alert').filter({ hasText: "Couldn't load orders" })
    await expect(error).toBeVisible()
    await expect(error).toContainText('temporarily unavailable')

    await error.getByRole('button', { name: 'Try again' }).click()
    await expect(error).toBeHidden()
    await expect(page.locator('section.column--new').getByRole('article')).toHaveCount(4)
  })

  test('each screen recovers from a failed load', async ({ page }) => {
    for (const [path, title] of [
      ['menu?fail=menu&latency=0', "Couldn't load the menu"],
      ['sales?fail=sales&latency=0', "Couldn't load sales"],
      ['staff?fail=staff&latency=0', "Couldn't load staff"],
    ] as const) {
      await page.goto(path)
      const error = page.getByRole('alert').filter({ hasText: title })
      await expect(error).toBeVisible()
      await error.getByRole('button', { name: 'Try again' }).click()
      await expect(error).toBeHidden()
    }
  })
})
