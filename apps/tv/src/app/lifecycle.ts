export interface LifecycleResources {
  save(): void;
  suspend(): void;
  revalidate(): Promise<void>;
  resume(): void;
}
export class LifecycleCoordinator {
  private epoch = 0;
  private hidden = false;
  private disposed = false;
  constructor(private readonly resources: LifecycleResources) {}
  async setHidden(hidden: boolean): Promise<void> {
    if (this.disposed || hidden === this.hidden) return;
    this.hidden = hidden;
    const epoch = ++this.epoch;
    if (hidden) {
      try { this.resources.save(); } finally { this.resources.suspend(); }
    } else {
      try {
        await this.resources.revalidate();
        if (!this.disposed && !this.hidden && epoch === this.epoch) this.resources.resume();
      } catch {
        if (epoch === this.epoch) { this.hidden = true; this.resources.suspend(); }
        throw new Error('resume.revalidation_failed');
      }
    }
  }
  dispose(): void { this.disposed = true; this.epoch++; this.resources.suspend(); }
}
