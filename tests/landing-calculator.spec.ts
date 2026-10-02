import { expect, test } from '@playwright/test';
import { calculateLandingAmount, decimalToCents } from '../src/lib/landing-calculator';

test('the tenant rate produces the approved quetzal examples without a fixed fee', () => {
  expect(calculateLandingAmount('100.00', 490)).toEqual({ ok: true, amount: 10_000, fee: 490, net: 9_510 });
  expect(calculateLandingAmount('1000', 490)).toEqual({ ok: true, amount: 100_000, fee: 4_900, net: 95_100 });
  expect(calculateLandingAmount('0.01', 490)).toEqual({ ok: true, amount: 1, fee: 0, net: 1 });
});

test('commissions round half a cent up and retain amount = fee + net', () => {
  expect(calculateLandingAmount('5', 490)).toEqual({ ok: true, amount: 500, fee: 25, net: 475 });
  expect(calculateLandingAmount('4.99', 490)).toEqual({ ok: true, amount: 499, fee: 24, net: 475 });
  expect(calculateLandingAmount('9999999.99', 490)).toEqual({
    ok: true, amount: 999_999_999, fee: 49_000_000, net: 950_999_999,
  });
  for (const value of ['0.01', '1.99', '5', '100', '8453.77', '9999999.99']) {
    const result = calculateLandingAmount(value, 490);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Number.isSafeInteger(result.net)).toBe(true);
      expect(result.fee + result.net).toBe(result.amount);
      expect(result.net).toBeGreaterThanOrEqual(0);
    }
  }
});

test('decimal comma and whitespace preserve cents without locale ambiguity', () => {
  expect(decimalToCents(' 100,10 ')).toBe(10_010);
  expect(decimalToCents('0.1')).toBe(10);
  expect(decimalToCents('0000001.09')).toBe(109);
  expect(calculateLandingAmount('100,10', 490)).toEqual({ ok: true, amount: 10_010, fee: 490, net: 9_520 });
});

test('invalid and excessive amounts are rejected rather than partly parsed', () => {
  for (const value of ['', ' ', '0', '0.00', '-1', '+1', '1e2', 'Q100', 'NaN', 'Infinity', '1.234', '1,234', '1,000.00', '.50', '1.', '10000000', '1 00']) {
    expect(calculateLandingAmount(value, 490), value).toEqual({ ok: false, reason: 'invalid-amount' });
  }
});

test('tenant rates are required to be safe whole basis points within the amount', () => {
  for (const rate of [-1, 490.5, 10_001, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    expect(calculateLandingAmount('100', rate)).toEqual({ ok: false, reason: 'invalid-rate' });
  }
  expect(calculateLandingAmount('100', 0)).toEqual({ ok: true, amount: 10_000, fee: 0, net: 10_000 });
  expect(calculateLandingAmount('100', 10_000)).toEqual({ ok: true, amount: 10_000, fee: 10_000, net: 0 });
});
