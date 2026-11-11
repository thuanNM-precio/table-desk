import { expect, test } from '@playwright/test'

test.describe('Staff', () => {
  test('invites a team member with validation', async ({ page }) => {
    await page.goto('staff?latency=0')
    await page.getByRole('button', { name: /Invite staff/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Invite staff' })

    await dialog.getByLabel('Full name').fill('Rina Lopez')
    await dialog.getByLabel('Work email').fill('rina@')
    await dialog.getByLabel('Work email').blur()
    await expect(dialog.getByText('Enter an email like name@restaurant.com.')).toBeVisible()

    await dialog.getByRole('button', { name: 'Send invitation' }).click()
    await expect(dialog.getByText('Pick a role.')).toBeVisible()

    // Server-side check: the email already belongs to someone on the team.
    await dialog.getByLabel('Work email').fill('joy@saltember.test')
    await dialog.getByRole('radio', { name: /Server/ }).check()
    await dialog.getByRole('button', { name: 'Send invitation' }).click()
    await expect(dialog.getByText('Someone with this email is already on the team.')).toBeVisible()
    await expect(dialog.getByLabel('Work email')).toBeFocused()

    await dialog.getByLabel('Work email').fill('rina@saltember.test')
    await dialog.getByRole('button', { name: 'Send invitation' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByTestId('toast').filter({ hasText: 'Invitation sent to rina@saltember.test' })).toBeVisible()
    await expect(page.locator('[data-member="Rina Lopez"]')).toContainText('Invited')
  })

  test('changes a role and deactivates with confirmation and Undo', async ({ page }) => {
    await page.goto('staff?latency=0')
    const role = page.getByRole('combobox', { name: 'Role for Paolo Cruz' })
    await role.selectOption('cashier')
    await expect(page.getByTestId('toast').filter({ hasText: 'Paolo Cruz is now Cashier' })).toBeVisible()
    await expect(role).toHaveValue('cashier')

    // The owner can't be demoted or deactivated.
    await expect(page.getByRole('combobox', { name: 'Role for Andrea Reyes' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Deactivate Andrea Reyes' })).toHaveCount(0)

    await page.getByRole('button', { name: 'Deactivate Bea Mendoza' }).click()
    const confirm = page.getByRole('dialog', { name: 'Deactivate Bea Mendoza?' })
    await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused()
    await confirm.getByRole('button', { name: 'Deactivate' }).click()
    await expect(confirm).toBeHidden()

    const row = page.locator('[data-member="Bea Mendoza"]')
    await expect(row).toContainText('Deactivated')
    await page.getByTestId('toast').filter({ hasText: 'Bea Mendoza deactivated' }).getByRole('button', { name: 'Undo' }).click()
    await expect(row).toContainText('Active')
    await expect(row.getByRole('button', { name: 'Deactivate Bea Mendoza' })).toBeVisible()
  })
})
