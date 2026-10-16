// Candidate NVA wire frames. Private transport values never become diagnostic IPC.
export type CastJson = null | boolean | number | string | CastJson[] | { [key: string]: CastJson };
export type NvaFrame =
  | { kind: 'command'; sequence: number; method: string; data?: { [key: string]: CastJson } }
  | { kind: 'response'; sequence: number; data?: { [key: string]: CastJson } }
  | { kind: 'ping'; sequence: number };
