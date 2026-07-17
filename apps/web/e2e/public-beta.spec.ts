import { expect, test, type Page } from '@playwright/test'

async function developmentSignIn(page: Page, email: string) {
  await page.goto('/sign-in')
  await page.getByLabel('Email address').fill(email)
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click()
  await page
    .getByRole('link', { name: 'Continue with development sign-in' })
    .click()
}

test('signs in, saves a schedule, favorites, reviews, shares, and moderates', async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== 'desktop',
    'The existing planner flow covers narrow UI.'
  )

  await developmentSignIn(page, 'student@cuweave.local')
  await expect(
    page.getByRole('heading', { name: /Welcome, Development Student/ })
  ).toBeVisible()

  await page.goto('/courses/ZZZZ1001')
  const favorite = page.getByRole('button', { name: /Favorite/ })
  if ((await favorite.getAttribute('aria-pressed')) !== 'true')
    await favorite.click()
  await expect(page.getByRole('button', { name: /Favorited/ })).toBeVisible()

  const existingDelete = page.getByRole('button', { name: 'Delete' })
  if (await existingDelete.count()) {
    page.once('dialog', (dialog) => void dialog.accept())
    await existingDelete.first().click()
    await expect(page.getByRole('status')).toContainText('Review deleted.')
  }
  await page
    .getByLabel('Written review')
    .fill(
      'Synthetic Playwright review for the integrated Public Beta experience.'
    )
  await page
    .getByLabel('Assessment summary')
    .fill('Synthetic project and quiz context.')
  await page.getByRole('button', { name: 'Publish review' }).click()
  await expect(page.getByText('Review published.')).toBeVisible()

  page.once(
    'dialog',
    (dialog) => void dialog.accept('Synthetic Playwright report.')
  )
  await page.getByRole('button', { name: 'Report' }).first().click()
  await expect(
    page.getByText('Review reported for moderator review.')
  ).toBeVisible()

  await page.getByRole('button', { name: 'Add to planner' }).first().click()
  await page.getByRole('link', { name: /View planner/ }).click()
  await page.getByRole('button', { name: 'Save cloud copy' }).click()
  await expect(page.getByText(/Saved as a new cloud schedule/)).toBeVisible()

  await page.goto('/schedules')
  await page.getByRole('button', { name: 'Share', exact: true }).first().click()
  const status = page.getByRole('status')
  await expect(status).toContainText('/share/')
  const sharePath = (await status.textContent())?.match(
    /\/share\/[A-Za-z0-9_-]+/
  )?.[0]
  expect(sharePath).toBeTruthy()
  await page.goto(sharePath ?? '/')
  await expect(page.getByText('Read-only share')).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForURL('/')
  await developmentSignIn(page, 'moderator@cuweave.local')
  await page.goto('/moderation')
  await expect(
    page.getByRole('heading', { name: /incorrect report/i }).first()
  ).toBeVisible()
  page.once(
    'dialog',
    (dialog) => void dialog.accept('Resolved by synthetic moderator.')
  )
  await page
    .getByRole('button', { name: 'Resolve, keep visible' })
    .first()
    .click()
  await expect(
    page.getByText('Report resolved with an audit timestamp.')
  ).toBeVisible()
})
