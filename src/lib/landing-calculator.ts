/** Informational landing calculation only; this does not determine payment fees. */
export type LandingCalculation =
  | { ok: true; amount: number; fee: number; net: number }
  | { ok: false; reason: 'invalid-amount' | 'invalid-rate' };

/** Parse the approved input range without binary floating-point arithmetic. */
export function decimalToCents(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d{1,7}(?:[.,]\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.replace(',', '.').split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export function calculateLandingAmount(
  value: string,
  commissionBasisPoints: number,
): LandingCalculation {
  const amount = decimalToCents(value);
  if (amount === null || amount <= 0) return { ok: false, reason: 'invalid-amount' };
  if (
    !Number.isSafeInteger(commissionBasisPoints) ||
    commissionBasisPoints < 0 ||
    commissionBasisPoints > 10_000
  ) return { ok: false, reason: 'invalid-rate' };

  // Round the commission once, half up, in integer cents. No fixed fee or tax.
  const fee = Number((BigInt(amount) * BigInt(commissionBasisPoints) + 5_000n) / 10_000n);
  return { ok: true, amount, fee, net: amount - fee };
}
