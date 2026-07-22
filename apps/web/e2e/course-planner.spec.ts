import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

test('normalizes search and isolates persisted planner terms and meetings', async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== 'desktop',
    'This flow explicitly resizes through desktop and 390px states.'
  )
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
  await expect(
    page.getByText(/include unscheduled meeting details/)
  ).toBeVisible()
  const termOne = page.getByLabel('2099-00 Term 1 weekly timetable')
  await expect(termOne.getByText('8:00 AM')).toBeVisible()
  await expect(termOne.getByText('11:00 PM')).toBeVisible()
  await expect(termOne.getByLabel('Saturday')).toBeVisible()
  await expect(termOne.getByLabel('Sunday')).toBeVisible()
  const timetableScroller = termOne.getByTestId('timetable-horizontal-scroll')
  const desktopOverflow = await timetableScroller.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    inlineHeight: element.style.height,
    inlineMaxHeight: element.style.maxHeight,
  }))
  expect(desktopOverflow.scrollHeight).toBe(desktopOverflow.clientHeight)
  expect(desktopOverflow.inlineHeight).toBe('auto')
  expect(desktopOverflow.inlineMaxHeight).toBe('none')
  const termOneMeeting = termOne.getByRole('button', { name: /ZZZZ1001/ })
  await expect(termOneMeeting).toHaveCount(1)
  await expect(termOneMeeting).toHaveAttribute('data-start-minutes', '570')
  await expect(termOne.getByRole('button', { name: /ZZZZ1003/ })).toHaveCount(0)

  await termOneMeeting.focus()
  await termOneMeeting.press('Enter')
  const desktopDetails = page.getByRole('dialog', {
    name: 'Synthetic Security & Privacy Systems',
  })
  await expect(desktopDetails).toBeVisible()
  await expect(desktopDetails.getByText('Professor SAMPLE Alpha')).toBeVisible()
  await expect(desktopDetails.getByText('Synthetic Room A')).toBeVisible()
  await expect(desktopDetails.getByText(/2099-00 Term 1/)).toBeVisible()
  await expect(
    desktopDetails.getByRole('link', { name: 'View course' })
  ).toHaveAttribute('href', '/courses/ZZZZ1001')
  await desktopDetails.press('Escape')
  await expect(desktopDetails).toBeHidden()
  await expect(termOneMeeting).toBeFocused()

  await page.setViewportSize({ width: 390, height: 844 })
  const narrowOverflow = await timetableScroller.evaluate((element) => ({
    clientHeight: element.clientHeight,
    clientWidth: element.clientWidth,
    scrollHeight: element.scrollHeight,
    scrollWidth: element.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
  }))
  expect(narrowOverflow.scrollWidth).toBeGreaterThan(narrowOverflow.clientWidth)
  expect(narrowOverflow.scrollHeight).toBe(narrowOverflow.clientHeight)
  expect(narrowOverflow.documentScrollWidth).toBeLessThanOrEqual(
    narrowOverflow.documentClientWidth + 1
  )

  await termOneMeeting.click()
  const mobileDetails = page.getByRole('dialog', {
    name: 'Synthetic Security & Privacy Systems',
  })
  await expect(mobileDetails).toBeVisible()
  await expect(mobileDetails).toHaveCSS('bottom', '0px')
  await mobileDetails
    .getByRole('button', { name: 'Close meeting details' })
    .click()
  await expect(termOneMeeting).toBeFocused()

  await page.getByRole('tab', { name: /2099-00 Term 2/ }).click()
  const termTwo = page.getByLabel('2099-00 Term 2 weekly timetable')
  await expect(termTwo.getByRole('button', { name: /ZZZZ1003/ })).toHaveCount(1)
  await expect(termTwo.getByRole('button', { name: /ZZZZ1001/ })).toHaveCount(0)

  await page.getByText('Export calendar', { exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Current term (.ics)' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('CUWeave-2099-00-Term-2.ics')
  const path = await download.path()
  expect(path).not.toBeNull()
  const calendar = await readFile(path, 'utf8')
  expect(calendar).toContain('BEGIN:VCALENDAR\r\nVERSION:2.0')
  expect(calendar).toContain('X-WR-CALNAME:CUWeave 2099-00 Term 2')
  expect(calendar).toContain('DTSTART;TZID=Asia/Hong_Kong:21000113T123000')
  expect(calendar).not.toContain('2099-00 Term 1')

  await page.reload()
  await expect(page.getByText(/3 selected sections/)).toBeVisible()
  await expect(page.getByLabel('2099-00 Term 2 weekly timetable')).toBeVisible()

  await page.getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(page.getByLabel('2099-00 Term 1 weekly timetable')).toBeVisible()
  await expect(page.getByText(/2 selected sections/)).toBeVisible()
})
