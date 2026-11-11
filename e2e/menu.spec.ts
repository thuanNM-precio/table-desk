import { expect, test } from '@playwright/test'

test.describe('Menu', () => {
  test('marks an item sold out inline, with Undo', async ({ page }) => {
    await page.goto('menu?latency=0')
    const available = page.getByRole('switch', { name: 'Lumpia Shanghai available' })
    await expect(available).toHaveAttribute('aria-checked', 'true')

    await available.click()
    await expect(available).toHaveAttribute('aria-checked', 'false')
    const toast = page.getByTestId('toast').filter({ hasText: 'Lumpia Shanghai marked sold out' })
    await expect(toast).toBeVisible()

    // Z undoes the latest change from anywhere.
    await page.keyboard.press('z')
    await expect(available).toHaveAttribute('aria-checked', 'true')
  })

  test('edits a price inline and rejects a bad value', async ({ page }) => {
    await page.goto('menu?latency=0')
    await page.getByRole('button', { name: /^Price of Chicken adobo/ }).click()
    const input = page.getByRole('textbox', { name: 'Price of Chicken adobo' })
    await expect(input).toBeFocused()

    await input.fill('abc')
    await input.press('Enter')
    await expect(page.getByRole('alert').filter({ hasText: 'Enter a price such as 180' })).toBeVisible()

    await input.fill('335')
    await input.press('Enter')
    await expect(page.getByRole('button', { name: /^Price of Chicken adobo: ₱335\.00/ })).toBeVisible()
    await expect(page.getByTestId('toast').filter({ hasText: 'Chicken adobo now ₱335.00' })).toBeVisible()
  })

  test('validates the add-item form, then adds the item', async ({ page }) => {
    await page.goto('menu?latency=0')
    await expect(page.locator('[data-item="Halo-halo"]')).toBeVisible()
    await page.keyboard.press('n')
    const dialog = page.getByRole('dialog', { name: 'Add menu item' })
    await expect(dialog).toBeVisible()

    // Submitting empty shows every problem and focuses the first one.
    await dialog.getByRole('button', { name: 'Add item' }).click()
    await expect(dialog.getByText('Give the item a name.')).toBeVisible()
    await expect(dialog.getByText('Pick a category.')).toBeVisible()
    await expect(dialog.getByText('Enter a price such as 180 or 180.50.')).toBeVisible()
    await expect(dialog.getByLabel('Name')).toBeFocused()
    await expect(dialog.getByLabel('Name')).toHaveAttribute('aria-invalid', 'true')

    // A duplicate name in the same category is caught by the server (422) and shown on the field.
    await dialog.getByLabel('Name').fill('Halo-halo')
    await dialog.getByLabel('Category').selectOption({ label: 'Desserts' })
    await dialog.getByLabel('Price').fill('2000000')
    await expect(dialog.getByText('Price must be ₱10,000 or less.')).toBeVisible()
    await dialog.getByLabel('Price').fill('165')
    await dialog.getByRole('button', { name: 'Add item' }).click()
    await expect(dialog.getByText('An item with this name already exists in this category.')).toBeVisible()

    await dialog.getByLabel('Name').fill('Turon')
    await dialog.getByRole('button', { name: 'Add item' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByTestId('toast').filter({ hasText: 'Turon added to the menu' })).toBeVisible()
    await expect(page.locator('[data-item="Turon"]')).toBeVisible()
  })
})
