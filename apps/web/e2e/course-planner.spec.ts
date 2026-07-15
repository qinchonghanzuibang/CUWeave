import { expect, test } from '@playwright/test'

test('searches courses, adds a conflict, and retains the local schedule', async ({
  page,
}) => {
  await page.goto('/courses?q=ZZZZ1001')
  await expect(page.getByRole('link', { name: /ZZZZ1001/ })).toBeVisible()
  await page.getByRole('link', { name: /ZZZZ1001/ }).click()
  await page.getByRole('button', { name: 'Add to planner' }).click()

  await page.goto('/courses?q=ZZZZ1002')
  await page.getByRole('link', { name: /ZZZZ1002/ }).click()
  await page.getByRole('button', { name: 'Add to planner' }).click()
  await page.getByRole('link', { name: /View planner/ }).click()

  await expect(page.getByText('2 selected sections')).toBeVisible()
  await expect(page.getByText('Uncertain conflict').first()).toBeVisible()
  await expect(page.getByText(/may overlap/).first()).toBeVisible()

  await page.reload()
  await expect(page.getByText('2 selected sections')).toBeVisible()
  await expect(
    page.getByText('ZZZZ1001', { exact: true }).first()
  ).toBeVisible()
})
