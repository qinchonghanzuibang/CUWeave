import { describe, expect, it } from 'vitest'

import { requirementsEnabled } from './features'

describe('server feature flags', () => {
  it('keeps requirements disabled by default and for non-exact values', () => {
    expect(requirementsEnabled({})).toBe(false)
    expect(requirementsEnabled({ FEATURE_REQUIREMENTS_ENABLED: 'false' })).toBe(
      false
    )
    expect(requirementsEnabled({ FEATURE_REQUIREMENTS_ENABLED: 'TRUE' })).toBe(
      false
    )
  })

  it('restores requirements only when an isolated environment opts in', () => {
    expect(requirementsEnabled({ FEATURE_REQUIREMENTS_ENABLED: 'true' })).toBe(
      true
    )
  })
})
