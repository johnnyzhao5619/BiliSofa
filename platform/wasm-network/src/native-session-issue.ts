export type NativeSessionIssue = 'fcntl_setfl' | 'fcntl_getfl' | 'ioctl_fionbio' | 'assertion' | 'runtime_abort' | 'unclosed' | 'worker_exception' | 'syscall_ioctl' | 'syscall_fcntl' | 'out_of_memory' | 'c_abort';
// Internal SDK diagnostic text is classified here, never sent to the UI/logs.
export function nativeSessionIssue(value: unknown): NativeSessionIssue | undefined {
  if (typeof value !== 'string' || value.length > 1024) return;
  if (/\bF_SETFL\b/.test(value)) return 'fcntl_setfl';
  if (/\bF_GETFL\b/.test(value)) return 'fcntl_getfl';
  if (/\bFIONBIO\b/.test(value)) return 'ioctl_fionbio';
  if (/assertion failed|assert failed/i.test(value)) return 'assertion';
  if (/___syscall54\b/.test(value)) return 'syscall_ioctl';
  if (/___syscall221\b/.test(value)) return 'syscall_fcntl';
  if (/abortOnCannotGrowMemory|out of memory|Cannot enlarge memory arrays/i.test(value)) return 'out_of_memory';
  if (/\b_abort\b/.test(value)) return 'c_abort';
  return;
}
export function nativeSessionStack(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 8192) return;
  const frames = [...value.matchAll(/wasm-function\[([0-9]{1,6})\]:(?:0x)?([0-9a-f]{1,8})\b/g)].slice(0, 2);
  if (frames.length) return 'session.native_stack_v1_' + frames.map(m => m[1] + '_' + m[2]).join('_');
  return;
}
