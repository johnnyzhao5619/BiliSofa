import { DomainError } from '../../contracts/src/index.ts';
/** Preview is an intention. It never publishes a fabricated playback tick. */
export class SeekPreview {
  private value: number | undefined;
  constructor(private readonly duration: () => number, private readonly actual: () => number) {}
  get targetMs(): number | undefined { return this.value; }
  move(deltaMs: number): number {
    const duration = this.duration(), actual = this.actual();
    if (!Number.isSafeInteger(deltaMs) || !Number.isSafeInteger(duration) || duration < 1 || !Number.isFinite(actual) || actual < 0) throw new DomainError('invalid');
    const origin = this.value ?? Math.floor(actual);
    this.value = Math.max(0, Math.min(duration - 1, origin + deltaMs));
    return this.value;
  }
  cancel(): void { this.value = undefined; }
  async confirm(seek: (ms: number) => Promise<void>): Promise<void> {
    if (this.value === undefined) throw new DomainError('invalid');
    const target = this.value;
    this.value = undefined;
    await seek(target);
  }
}
