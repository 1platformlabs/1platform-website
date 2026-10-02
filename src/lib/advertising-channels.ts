/**
 * Advertising channels a tenant may NAME on its landing, because it sells that
 * channel as its own service (website#vendefacil-landing D-1). This is the one
 * file of src/ allowed to spell these names: `scripts/check-tells.sh` rule 10
 * exempts it by place and by word, and only for them.
 *
 * A tenant opts in with the configuration key `photographic.verticals.ads.mode`
 * (staff-owned: the API classifies `*.mode` as configuration). Its copy writes
 * the markers below, so no stored text names the channel and the API's provider
 * guard keeps refusing the names typed by hand.
 */
export const ADVERTISING_CHANNELS = {
  meta: { name: 'Meta Ads', networks: ['Facebook', 'Instagram'] },
} as const

export type AdvertisingChannel = keyof typeof ADVERTISING_CHANNELS

export function isAdvertisingChannel(value: string): value is AdvertisingChannel {
  return Object.hasOwn(ADVERTISING_CHANNELS, value)
}

/** Replace `{adsName}`, `{adsNetwork1}` and `{adsNetwork2}` with the channel's names. */
export function nameAdvertisingChannel(text: string, channel: AdvertisingChannel): string {
  const { name, networks } = ADVERTISING_CHANNELS[channel]
  return text
    .replaceAll('{adsName}', name)
    .replaceAll('{adsNetwork1}', networks[0])
    .replaceAll('{adsNetwork2}', networks[1])
}
