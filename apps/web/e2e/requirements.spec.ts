import { expect, test } from '@playwright/test'

test('shows a source-backed draft requirement result without overclaiming', async ({
  page,
}) => {
  await page.goto('/requirements')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'what still needs confirmation'
  )
  await expect(page.getByText('draft', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Not reliable yet')).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'CUHK Graduate School programme page' })
  ).toHaveAttribute('href', /gs\.cuhk\.edu\.hk/)
  await expect(
    page.getByText(/CUSIS and your Division remain authoritative/)
  ).toBeVisible()
})
