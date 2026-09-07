import { describe, expect, it } from 'vitest'
import { getBuildLabel } from '@/lib/version'

// WHITE-BOX: getBuildLabel branches
describe('WHITE-BOX: getBuildLabel branches', () => {
  it('branch: undefined/null/blank → dev', () => {
    expect(getBuildLabel(undefined)).toBe('dev')
    expect(getBuildLabel(null)).toBe('dev')
    expect(getBuildLabel('')).toBe('dev')
    expect(getBuildLabel('   ')).toBe('dev')
  })
  it('branch: full 40-char hash → first 7', () => {
    expect(getBuildLabel('c'.repeat(40))).toBe('ccccccc')
  })
  it('branch: short hash passes through', () => {
    expect(getBuildLabel('ca9a96d')).toBe('ca9a96d')
  })
  it('branch: custom label trimmed + capped at 32', () => {
    expect(getBuildLabel('  v1.2.3  ')).toBe('v1.2.3')
    expect(getBuildLabel('Z'.repeat(40))).toHaveLength(32)
  })
})

// BLACK-BOX: footer marker spec — always renders a short non-blank label
describe('BLACK-BOX: build marker spec', () => {
  it('dev fallback is short and non-blank', () => {
    const label = getBuildLabel(undefined)
    expect(label.length).toBeGreaterThan(0)
    expect(label.length).toBeLessThanOrEqual(32)
  })
})
