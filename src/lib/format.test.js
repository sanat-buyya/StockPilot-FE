import { describe, expect, it } from 'vitest'
import { centsToString, formatDateTime, formatMoney, signed, toCents } from './format'
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

describe('INR and IST formatting', () => {
  it('formats amounts as Indian Rupees with lakh grouping', () => {
    expect(formatMoney('1148.10')).toBe('₹1,148.10')
    expect(formatMoney('1234567.5')).toBe('₹12,34,567.50')
  })

  it('shows timestamps in IST regardless of the machine timezone', () => {
    // 2026-10-12T20:00Z is 01:30 on 13 Oct in IST (UTC+05:30)
    expect(formatDateTime('2026-10-12T20:00:00Z')).toContain('13')
    expect(formatDateTime('2026-10-12T20:00:00Z')).toMatch(/1:30/)
  })
})
