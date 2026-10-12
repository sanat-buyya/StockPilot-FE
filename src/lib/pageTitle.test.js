import { describe, expect, it } from 'vitest'
import { initials, pageTitle } from './pageTitle'

describe('pageTitle', () => {
  it('names each top-level page', () => {
    expect(pageTitle('/')).toBe('Dashboard')
    expect(pageTitle('/products')).toBe('Products')
    expect(pageTitle('/orders')).toBe('Orders')
    expect(pageTitle('/inventory')).toBe('Stock history')
    expect(pageTitle('/team')).toBe('Team')
  })

  it('distinguishes detail and create pages', () => {
    expect(pageTitle('/products/abc-123')).toBe('Product details')
    expect(pageTitle('/orders/new')).toBe('New order')
    expect(pageTitle('/orders/abc-123')).toBe('Order details')
  })

  it('falls back for unknown paths', () => {
    expect(pageTitle('/nope')).toBe('StockPilot')
  })
})

describe('initials', () => {
  it('uses first and last name', () => {
    expect(initials('Olivia Owner')).toBe('OO')
    expect(initials('  sam  ')).toBe('S')
    expect(initials('Mary Jane Watson')).toBe('MW')
    expect(initials('')).toBe('?')
  })
})
