import { expect, test } from '@playwright/test'

test('normalizes search and isolates persisted planner terms and meetings', async ({
  page,
}) => {
  for (const query of ['1001', 'zzzz1001', 'ZZZZ 1001', '  ZZZZ1001  ']) {
    await page.goto(`/courses?q=${encodeURIComponent(query)}`)
    await expect(page.getByRole('link', { name: /ZZZZ1001/ })).toBeVisible()
  }
  await page.goto('/courses?q=security%20privacy')
  await expect(page.getByRole('link', { name: /ZZZZ1001/ })).toBeVisible()
  await page.getByRole('link', { name: /ZZZZ1001/ }).click()
  await page.getByRole('button', { name: 'Add to planner' }).click()

  await page.goto('/courses?q=ZZZZ1002')
  await page.getByRole('link', { name: /ZZZZ1002/ }).click()
  await page.getByRole('button', { name: 'Add to planner' }).click()

  await page.goto('/courses?q=ZZZZ1003')
  await page.getByRole('link', { name: /ZZZZ1003/ }).click()
  await page.getByRole('button', { name: 'Add to planner' }).click()
  await page.getByRole('link', { name: /View planner/ }).click()

  await expect(page.getByText(/3 selected sections/)).toBeVisible()
  await expect(page.getByText(/2 visible in 2099-00 Term 1/)).toBeVisible()
  await expect(page.getByText('Uncertain conflict').first()).toBeVisible()
  await expect(page.getByText(/may overlap/).first()).toBeVisible()
  const termOne = page.getByLabel('2099-00 Term 1 weekly timetable')
  await expect(termOne.locator('article', { hasText: 'ZZZZ1001' })).toHaveCount(
    1
  )
  await expect(termOne.locator('article', { hasText: 'ZZZZ1003' })).toHaveCount(
    0
  )

  await page.getByRole('tab', { name: /2099-00 Term 2/ }).click()
  const termTwo = page.getByLabel('2099-00 Term 2 weekly timetable')
  await expect(termTwo.locator('article', { hasText: 'ZZZZ1003' })).toHaveCount(
    1
  )
  await expect(termTwo.locator('article', { hasText: 'ZZZZ1001' })).toHaveCount(
    0
  )

  await page.reload()
  await expect(page.getByText(/3 selected sections/)).toBeVisible()
  await expect(page.getByLabel('2099-00 Term 2 weekly timetable')).toBeVisible()

  await page.getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByLabel('2099-00 Term 1 weekly timetable')).toBeVisible()
  await expect(page.getByText(/2 selected sections/)).toBeVisible()
})
