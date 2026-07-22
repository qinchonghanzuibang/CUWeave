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
  await expect(page).toHaveURL(/\/courses\/ZZZZ1001$/)
  const courseOneUrl = page.url()
  await expect(
    page.getByRole('button', { name: 'Add to planner' })
  ).toHaveCount(2)
  await page.getByRole('button', { name: 'Add to planner' }).first().click()
  await expect(
    page.getByRole('link', { name: 'Added to planner' })
  ).toHaveCount(1)
  await expect(
    page.getByRole('button', { name: 'Remove from planner' })
  ).toHaveCount(1)
  await expect(
    page.getByRole('button', { name: 'Add to planner' })
  ).toHaveCount(1)

  await page.goto('/courses')
  await page.goBack()
  await expect(page).toHaveURL(courseOneUrl)
  await expect(
    page.getByRole('link', { name: 'Added to planner' })
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('link', { name: 'Added to planner' })
  ).toBeVisible()

  await page.goto('/courses?q=ZZZZ1002')
  await page.getByRole('link', { name: /ZZZZ1002/ }).click()
  await page.getByRole('button', { name: 'Add to planner' }).click()

  await page.goto('/courses?q=ZZZZ1003')
  await page.getByRole('link', { name: /ZZZZ1003/ }).click()
  await page.getByRole('button', { name: 'Add to planner' }).click()
  await page.goto('/planner')

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
  const overlappingMeeting = termOne.getByRole('button', { name: /ZZZZ1002/ })
  await expect(termOneMeeting).toHaveCount(1)
  await expect(overlappingMeeting).toHaveCount(1)
  await expect(termOneMeeting).toHaveAttribute('data-start-minutes', '570')
  await expect(termOne.getByRole('button', { name: /ZZZZ1003/ })).toHaveCount(0)

  await page.setViewportSize({ width: 1200, height: 560 })
  await timetableScroller.evaluate((element) => {
    element.scrollLeft = 180
  })
  const scrollBeforeDialog = await page.evaluate(() => ({
    pageX: scrollX,
    pageY: scrollY,
    timetableX: document.querySelector<HTMLElement>(
      '[data-testid="timetable-horizontal-scroll"]'
    )!.scrollLeft,
  }))
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
  const portal = page.getByTestId('meeting-dialog-portal')
  await expect(portal).toHaveCSS('position', 'fixed')
  expect(
    await portal.evaluate((element) => element.parentElement === document.body)
  ).toBe(true)
  const dialogLayout = await desktopDetails.evaluate((dialog) => {
    const content = dialog.querySelector<HTMLElement>(
      '[data-testid="meeting-dialog-content"]'
    )!
    const header = dialog.querySelector('header')!.getBoundingClientRect()
    const footer = dialog.querySelector('footer')!.getBoundingClientRect()
    const dialogRect = dialog.getBoundingClientRect()
    return {
      bodyOverflow: document.body.style.overflow,
      contentClientHeight: content.clientHeight,
      contentOverflowY: getComputedStyle(content).overflowY,
      contentScrollHeight: content.scrollHeight,
      dialogBottom: dialogRect.bottom,
      dialogTop: dialogRect.top,
      footerBottom: footer.bottom,
      headerTop: header.top,
      viewportHeight: innerHeight,
    }
  })
  expect(dialogLayout.bodyOverflow).toBe('hidden')
  expect(dialogLayout.contentOverflowY).toBe('auto')
  expect(dialogLayout.contentScrollHeight).toBeGreaterThan(
    dialogLayout.contentClientHeight
  )
  expect(dialogLayout.dialogTop).toBeGreaterThanOrEqual(0)
  expect(dialogLayout.dialogBottom).toBeLessThanOrEqual(
    dialogLayout.viewportHeight
  )
  expect(dialogLayout.headerTop).toBeGreaterThanOrEqual(dialogLayout.dialogTop)
  expect(dialogLayout.footerBottom).toBeLessThanOrEqual(
    dialogLayout.dialogBottom
  )
  await desktopDetails.getByText('View all teaching dates').click()
  await expect(desktopDetails.getByText('2099-09-01')).toBeVisible()
  await desktopDetails.press('Escape')
  await expect(desktopDetails).toBeHidden()
  await expect(termOneMeeting).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
  expect(
    await page.evaluate(() => ({
      pageX: scrollX,
      pageY: scrollY,
      timetableX: document.querySelector<HTMLElement>(
        '[data-testid="timetable-horizontal-scroll"]'
      )!.scrollLeft,
    }))
  ).toEqual(scrollBeforeDialog)

  await termOneMeeting.click()
  await portal.click({ position: { x: 4, y: 4 } })
  await expect(desktopDetails).toBeHidden()
  await expect(termOneMeeting).toBeFocused()

  await overlappingMeeting.click()
  await expect(
    page.getByRole('dialog', { name: 'Uncertain Scheduling' })
  ).toBeVisible()
  await page
    .getByRole('dialog', { name: 'Uncertain Scheduling' })
    .getByRole('button', { name: 'Close meeting details' })
    .click()
  await expect(overlappingMeeting).toBeFocused()

  await page.setViewportSize({ width: 390, height: 720 })
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
  const mobileLayout = await mobileDetails.evaluate((dialog) => {
    const rect = dialog.getBoundingClientRect()
    return {
      bottom: rect.bottom,
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      height: rect.height,
      viewportHeight: innerHeight,
      width: rect.width,
    }
  })
  expect(mobileLayout.bottom).toBeLessThanOrEqual(mobileLayout.viewportHeight)
  expect(mobileLayout.height).toBeLessThanOrEqual(
    mobileLayout.viewportHeight * 0.9
  )
  expect(mobileLayout.width).toBeLessThanOrEqual(
    mobileLayout.documentClientWidth
  )
  expect(mobileLayout.documentScrollWidth).toBeLessThanOrEqual(
    mobileLayout.documentClientWidth + 1
  )
  await mobileDetails.getByText('View all teaching dates').click()
  await expect(
    mobileDetails.getByRole('button', { name: 'Remove from planner' })
  ).toBeVisible()
  await mobileDetails
    .getByRole('button', { name: 'Close meeting details' })
    .click()
  await expect(termOneMeeting).toBeFocused()

  await page.setViewportSize({ width: 320, height: 640 })
  await termOneMeeting.press('Space')
  await expect(mobileDetails).toBeVisible()
  const narrowestLayout = await mobileDetails.evaluate((dialog) => ({
    bottom: dialog.getBoundingClientRect().bottom,
    documentClientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    height: dialog.getBoundingClientRect().height,
    viewportHeight: innerHeight,
  }))
  expect(narrowestLayout.bottom).toBeLessThanOrEqual(
    narrowestLayout.viewportHeight
  )
  expect(narrowestLayout.height).toBeLessThanOrEqual(
    narrowestLayout.viewportHeight * 0.9
  )
  expect(narrowestLayout.documentScrollWidth).toBeLessThanOrEqual(
    narrowestLayout.documentClientWidth + 1
  )
  await mobileDetails.press('Escape')
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

  const remainingMeeting = page
    .getByLabel('2099-00 Term 1 weekly timetable')
    .getByRole('button', { name: /ZZZZ1001/ })
  await remainingMeeting.click()
  await page
    .getByRole('dialog', { name: 'Synthetic Security & Privacy Systems' })
    .getByRole('button', { name: 'Remove from planner' })
    .click()
  await expect(page.getByText(/1 selected section/)).toBeVisible()
  await page.goto('/courses/ZZZZ1001')
  await expect(
    page.getByRole('button', { name: 'Add to planner' })
  ).toHaveCount(2)
})

test('synchronizes exact section state across tabs', async ({
  context,
  page,
}) => {
  test.skip(
    test.info().project.name !== 'desktop',
    'Cross-tab behavior needs one project run.'
  )
  await page.goto('/courses/ZZZZ1001')
  await page.getByRole('button', { name: 'Add to planner' }).first().click()

  const otherTab = await context.newPage()
  await otherTab.goto('/courses/ZZZZ1001')
  await expect(
    otherTab.getByRole('link', { name: 'Added to planner' })
  ).toHaveCount(1)
  await expect(
    otherTab.getByRole('button', { name: 'Add to planner' })
  ).toHaveCount(1)
  await otherTab.getByRole('button', { name: 'Remove from planner' }).click()
  await expect(
    page.getByRole('button', { name: 'Add to planner' })
  ).toHaveCount(2)
  await otherTab.close()
})
