import { describe, expect, it } from 'vitest'
import { centsToString, signed, toCents } from './format'

describe('money helpers (integer cents, no floats)', () => {
  it('parses decimal strings exactly', () => {
    expect(toCents('19.99')).toBe(1999)
    expect(toCents('0.10')).toBe(10)
    expect(toCents('5')).toBe(500)
    expect(toCents('7.5')).toBe(750)
    expect(Number.isNaN(toCents('abc'))).toBe(true)
  })

  it('sums line totals without rounding drift', () => {
    const total = 3 * toCents('19.99') + 3 * toCents('0.10')
    expect(centsToString(total)).toBe('60.27')
    expect(0.1 * 3 + 19.99 * 3).not.toBe(60.27) // the float approach would drift
  })

  it('formats cents', () => {
    expect(centsToString(5)).toBe('0.05')
    expect(centsToString(100000)).toBe('1000.00')
  })

  it('signs quantity changes', () => {
    expect(signed(4)).toBe('+4')
    expect(signed(-4)).toBe('-4')
  })
})
