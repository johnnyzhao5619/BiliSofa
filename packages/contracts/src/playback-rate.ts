/** Product choices, not a statement of a backend's measured capabilities. */
export const PLAYBACK_RATES = [.25, .5, .75, 1, 1.25, 1.5, 1.75, 2] as const;
export type PlaybackRate = typeof PLAYBACK_RATES[number];
export function isPlaybackRate(value: unknown): value is PlaybackRate {
  return typeof value === 'number' && PLAYBACK_RATES.some(rate => rate === value);
}
