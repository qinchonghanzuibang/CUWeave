import { expect, test } from '@playwright/test'

const publicRoutes = [
  '/',
  '/courses',
  '/planner',
  '/requirements',
  '/sign-in',
  '/data-status',
  '/feedback',
]

test('uses self-hosted display and UI fonts without page-level overflow', async ({
  page,
}, testInfo) => {
  const runtimeErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text())
  })
  page.on('pageerror', (error) => runtimeErrors.push(String(error)))

  const widths =
    testInfo.project.name === 'narrow' ? [390, 320] : [1440, 1280, 768]

  for (const width of widths) {
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 })
    for (const route of publicRoutes) {
      await page.goto(route)
      await expect(page.getByRole('navigation').first()).toBeVisible()
      const pageWidth = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }))
      expect(
        pageWidth.scroll,
        `${route} overflows at ${width}px`
      ).toBeLessThanOrEqual(pageWidth.client + 1)
    }
  }

  await page.goto('/')
  const heroFont = await page
    .locator('h1')
    .evaluate((element) => getComputedStyle(element).fontFamily)
  const navFont = await page
    .getByRole('navigation')
    .first()
    .evaluate((element) => getComputedStyle(element).fontFamily)
  expect(heroFont).toContain('EB Garamond')
  expect(navFont).toContain('Inter')
  expect(runtimeErrors).toEqual([])
})
