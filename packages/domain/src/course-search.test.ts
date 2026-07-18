import { describe, expect, it } from 'vitest'

import { normalizeCourseSearch } from './index'

describe('course search normalization', () => {
  it.each([
    ['IERG5310', 'ierg5310', ['ierg5310']],
    ['ierg5310', 'ierg5310', ['ierg5310']],
    [' IERG 5310 ', 'ierg5310', ['ierg', '5310']],
    ['IERG-5310', 'ierg5310', ['ierg', '5310']],
    ['security & privacy', 'securityprivacy', ['security', 'privacy']],
  ])('normalizes %s', (input, compactCode, titleTokens) => {
    expect(normalizeCourseSearch(input)).toEqual({ compactCode, titleTokens })
  })
})
