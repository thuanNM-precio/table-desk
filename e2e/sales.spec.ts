import { expect, test } from '@playwright/test'

test.describe('Sales', () => {
  test('shows today, then the last 7 days', async ({ page }) => {
    await page.goto('sales?latency=0')
    for (const label of ['Revenue', 'Orders', 'Average ticket']) {
      await expect(page.getByRole('region', { name: label })).toContainText(/(Up|Down) .*vs yesterday/)
    }
    await expect(page.getByRole('heading', { name: 'Revenue by hour' })).toBeVisible()
    await expect(page.getByRole('img', { name: /Revenue by hour\. Peak at/ })).toBeVisible()
    await expect(page.locator('.top-item')).toHaveCount(5)

    await page.getByRole('group', { name: 'Period' }).getByRole('button', { name: 'Last 7 days' }).click()
    await expect(page).toHaveURL(/range=7d/)
    await expect(page.getByRole('heading', { name: 'Revenue by day' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Revenue' })).toContainText('vs previous 7 days')

    // The chart's numbers are available as a table for screen readers and exact values.
    await page.getByText('Show the numbers').click()
    await expect(page.locator('.numbers tbody tr')).toHaveCount(7)
  })
})
