import { expect, test } from '@playwright/test'

// iPad Air-class tablet in portrait, touch enabled.
test.use({ viewport: { width: 834, height: 1194 }, hasTouch: true, isMobile: false })

const MIN_TARGET = 44

test.describe('Tablet', () => {
  for (const path of ['orders', 'menu', 'staff']) {
    test(`${path}: every control is at least ${MIN_TARGET}px tall and nothing scrolls sideways`, async ({ page }) => {
      await page.goto(`${path}?latency=0`)
      await expect(page.locator('main h1')).toBeVisible()
      await expect(page.locator('main .state--loading')).toHaveCount(0)

      const small = await page
        .locator('main button:visible, main select:visible, main input:not([type=radio]):not([type=checkbox]):visible, .sidebar a:visible')
        .evaluateAll((elements, min) =>
          elements
            .map((el) => ({ el, rect: el.getBoundingClientRect() }))
            .filter(({ rect }) => rect.height > 0 && rect.height < min - 0.5)
            .map(({ el, rect }) => `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)}" ${Math.round(rect.height)}px`),
          MIN_TARGET,
        )
      expect(small).toEqual([])

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }

  test('sidebar collapses to an icon rail that still names each screen', async ({ page }) => {
    await page.goto('orders?latency=0')
    const sidebar = page.locator('.sidebar')
    expect((await sidebar.boundingBox())?.width).toBeLessThan(100)
    await page.getByRole('link', { name: /Menu/ }).tap()
    await expect(page).toHaveURL(/\/menu/)
    await expect(page.getByRole('heading', { level: 1, name: 'Menu' })).toBeVisible()
  })
})
