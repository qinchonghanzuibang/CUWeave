import { expect, test, type Page } from '@playwright/test'

async function developmentSignIn(page: Page, email: string) {
  const testAddress =
    email === 'student@cuweave.local' ? '192.0.2.21' : '192.0.2.22'
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': testAddress })
  await page.goto('/sign-in')
  await page.getByLabel('CUHK student email').fill(email)
  await page.getByRole('button', { name: 'Send verification code' }).click()
  await page.getByLabel('Six-digit code').fill('123456')
  await page.getByRole('button', { name: 'Verify and sign in' }).click()
  await page.waitForURL('/profile')
}

test('shows the anonymous launch navigation without privileged links', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  const primary = page.getByRole('navigation', { name: 'Primary navigation' })
  if (testInfo.project.name === 'narrow') {
    await primary.getByRole('button', { name: 'Menu' }).click()
  } else {
    await expect(primary.locator('button.mobile-menu-trigger')).toBeHidden()
  }
  const surface =
    testInfo.project.name === 'narrow'
      ? page.getByRole('menu', { name: 'Mobile navigation' })
      : primary
  const itemRole = testInfo.project.name === 'narrow' ? 'menuitem' : 'link'
  await expect(surface.getByRole(itemRole, { name: 'Courses' })).toBeVisible()
  await expect(surface.getByRole(itemRole, { name: 'Planner' })).toBeVisible()
  await expect(surface.getByRole(itemRole, { name: 'Sign in' })).toBeVisible()
  await expect(
    surface.getByRole(itemRole, { name: 'Home', exact: true })
  ).toHaveCount(0)
  await expect(surface.getByRole(itemRole, { name: 'Schedules' })).toHaveCount(
    0
  )
  await expect(
    surface.getByRole(itemRole, { name: 'Requirements' })
  ).toHaveCount(0)
  await expect(surface.getByRole(itemRole, { name: 'GitHub' })).toHaveCount(0)
  await expect(page.getByText('Beta', { exact: true })).toHaveCount(0)
})

test('shows immediate feedback while an internal route is loading', async ({
  page,
}) => {
  await page.route('**/courses?*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 450))
    await route.continue()
  })
  await page.goto('/')

  const feedback = page.locator('.navigation-progress')
  await page.getByRole('link', { name: 'Explore courses' }).click()
  await expect(feedback).toHaveAttribute('data-phase', 'loading')
  await expect(page.locator('html')).toHaveAttribute(
    'data-navigation',
    'loading'
  )

  await page.waitForURL('/courses')
  await expect(feedback).toHaveAttribute('data-phase', 'idle')
  await expect(page.locator('html')).not.toHaveAttribute('data-navigation')
})

test('keeps ordinary account actions in the account menu', async ({
  page,
}, testInfo) => {
  await developmentSignIn(page, 'student@cuweave.local')
  const primary = page.getByRole('navigation', { name: 'Primary navigation' })
  await expect(primary.getByRole('link', { name: 'Moderation' })).toHaveCount(0)
  if (testInfo.project.name === 'desktop')
    await expect(primary.getByRole('link', { name: 'Schedules' })).toBeVisible()

  const trigger = primary.getByRole('button', {
    name: testInfo.project.name === 'narrow' ? 'Menu' : 'Account',
  })
  await trigger.click()
  const menu = page.getByRole('menu', {
    name: testInfo.project.name === 'narrow' ? 'Mobile navigation' : 'Account',
  })
  if (testInfo.project.name === 'narrow')
    await expect(
      menu.getByRole('menuitem', { name: 'Schedules' })
    ).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Profile' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Sign out' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Moderation' })).toHaveCount(
    0
  )
  await expect(
    menu.getByRole('menuitem', { name: 'Requirement admin' })
  ).toHaveCount(0)

  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await menu.getByRole('menuitem', { name: 'Sign out' }).click()
  await page.waitForURL('/')
  if (testInfo.project.name === 'narrow')
    await primary.getByRole('button', { name: 'Menu' }).click()
  await expect(
    page.getByRole('link', { name: 'Sign in' }).first()
  ).toBeVisible()
})

test('shows only persisted-role administration links to administrators', async ({
  page,
}, testInfo) => {
  await developmentSignIn(page, 'admin@cuweave.local')
  const primary = page.getByRole('navigation', { name: 'Primary navigation' })
  await expect(primary.getByRole('link', { name: 'Moderation' })).toHaveCount(0)
  if (testInfo.project.name === 'desktop')
    await expect(primary.getByRole('link', { name: 'Schedules' })).toBeVisible()
  await primary
    .getByRole('button', {
      name: testInfo.project.name === 'narrow' ? 'Menu' : 'Account',
    })
    .click()
  const menu = page.getByRole('menu', {
    name: testInfo.project.name === 'narrow' ? 'Mobile navigation' : 'Account',
  })
  if (testInfo.project.name === 'narrow')
    await expect(
      menu.getByRole('menuitem', { name: 'Schedules' })
    ).toBeVisible()
  await expect(menu.getByText('Administration', { exact: true })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Moderation' })).toBeVisible()
  await expect(
    menu.getByRole('menuitem', { name: 'Requirement admin' })
  ).toHaveCount(0)

  const response = await page.request.get('/admin/requirements')
  expect(response.status()).toBe(404)
})

test('provides equivalent touch navigation with Escape focus return', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'Menu' })
  await trigger.click()
  const menu = page.getByRole('menu', { name: 'Mobile navigation' })
  await expect(menu.getByRole('menuitem', { name: 'Courses' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Planner' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Sign in' })).toBeVisible()
  await expect(
    menu.getByRole('menuitem', { name: 'Requirements' })
  ).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(trigger).toBeFocused()
})
