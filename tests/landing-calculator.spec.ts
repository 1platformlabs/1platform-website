import { expect, test } from '@playwright/test';
import { calculateLandingAmount, calculateWithPercentage, decimalToCents, percentageToBasisPoints } from '../src/lib/landing-calculator';

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

test('a visitor-entered percentage is required: there is no tenant or default rate', () => {
  expect(calculateWithPercentage('250.00', '3.50')).toEqual({ ok: true, amount: 25_000, fee: 875, net: 24_125 });
  expect(calculateWithPercentage('100.00', '')).toEqual({ ok: false, reason: 'invalid-rate' });
  expect(calculateWithPercentage('', '')).toEqual({ ok: false, reason: 'invalid-amount' });
});

test('visitor percentages accept a decimal comma and round the commission once, half up', () => {
  expect(calculateWithPercentage('1,50', '0,50')).toEqual({ ok: true, amount: 150, fee: 1, net: 149 });
  expect(calculateWithPercentage('0.01', '50')).toEqual({ ok: true, amount: 1, fee: 1, net: 0 });
  expect(calculateWithPercentage('100.00', '0')).toEqual({ ok: true, amount: 10_000, fee: 0, net: 10_000 });
  expect(calculateWithPercentage('100.00', '100')).toEqual({ ok: true, amount: 10_000, fee: 10_000, net: 0 });
  const largest = calculateWithPercentage('9999999.99', '99.99');
  expect(largest).toEqual({ ok: true, amount: 999_999_999, fee: 999_899_999, net: 100_000 });
});

test('out-of-range or ambiguous percentages are rejected rather than partly parsed', () => {
  for (const rate of ['', ' ', '-1', '+1', '100.01', '101', '1e2', '3.333', 'NaN', '4.9%', '.5']) {
    expect(percentageToBasisPoints(rate), rate).toBeNull();
    expect(calculateWithPercentage('100', rate), rate).toEqual({ ok: false, reason: 'invalid-rate' });
  }
  expect(percentageToBasisPoints(' 4,90 ')).toBe(490);
});
