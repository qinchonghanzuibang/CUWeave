import { expect, test } from '@playwright/test'

test('keeps requirement pages and APIs unavailable at the server boundary', async ({
  request,
}) => {
  for (const path of ['/requirements', '/admin/requirements']) {
    const response = await request.get(path)
    expect(response.status(), path).toBe(404)
  }

  const response = await request.post('/api/v1/requirements', { data: {} })
  expect(response.status()).toBe(404)
  await expect(response.json()).resolves.toEqual({ error: 'Not found.' })
})
