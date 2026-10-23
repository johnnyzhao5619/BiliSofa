import type { VodItem } from './vod-catalog.ts';
/** Worker-internal source plan. Never a page, diagnostic or ordinary-store DTO. */
export interface PrivateVodTrack {
  url: string;
  /** 0.50.3 (ADR-101): Bilibili's own backup on another host; the bridge fails over to it per track. */
  alternate?: string;
  expiresAt: number;
  codec: string;
  bandwidth: number;
  initialization: string;
  indexRange: string;
  width?: number;
  height?: number;
}
export interface PrivateVodPlan {
  item: VodItem;
  durationMs: number;
  video: PrivateVodTrack;
  audio: PrivateVodTrack;
  expiresAt: number;
}
/** Totals come only from validated 206 bytes 0-511 responses for each track. */
export interface VodSourceTotals { video: number; audio: number; }
