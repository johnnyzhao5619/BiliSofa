export interface OverlayBinding { accountId: string; generation: number; mediaSessionId: string; itemKey: string; }
export interface SubtitleCue { id: string; startMs: number; endMs: number; content: string; }
export interface OverlayPreferences {
  schema: 1;
  danmaku: { enabled: boolean; fontSize: number; opacity: number; density: number; area: number; filters: string[]; };
  subtitles: { enabled: boolean; fontSize: number; offsetMs: number; language: string; };
}
export interface SubtitleTrack { key: string; language: string; label: string; automatic: boolean; }
export interface OverlayDanmaku { id: string; timeMs: number; mode: 'scroll' | 'top' | 'bottom'; color: number; content: string; }
export interface OverlayTarget { bvid: string; part: number; seasonId?: string; }
export type OverlayCommand = { kind: 'metadata' } | { kind: 'subtitles'; track: SubtitleTrack } | { kind: 'danmaku'; segment: number };
export type OverlayValue = { kind: 'metadata'; tracks: SubtitleTrack[]; loginRequired: boolean } | { kind: 'subtitles'; cues: SubtitleCue[] } | { kind: 'danmaku'; items: OverlayDanmaku[] };
export interface OverlayAccess { readonly identity: string; read(command: OverlayCommand, signal: AbortSignal): Promise<OverlayValue>; close(): Promise<void>; }
export type OverlayStorageIssue = 'unavailable' | 'corrupt' | 'future' | 'unconfirmed';
export interface OverlayPreferenceAccess {
  read(): { kind: 'ok'; value: OverlayPreferences } | { kind: OverlayStorageIssue };
  save(value: OverlayPreferences): 'saved' | 'deleted' | OverlayStorageIssue;
  clear(): 'saved' | 'deleted' | OverlayStorageIssue;
}
