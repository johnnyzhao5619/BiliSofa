/** Receipt for one fixed, uninterrupted normal-speed observation. No cloud writes. */
export interface WatchReceipt {
    startedAtSec: number;
    positionSec: number;
    realSec: number;
    wallSec: number;
}
export class WatchObservation {
    private first = true;
    private invalid = false;
    private last: {
        wall: number;
        media: number;
    } | undefined;
    private observed = 0;
    constructor(private readonly startWall: number, private readonly startUnix: number) { }
    add(wall: number, media: number): WatchReceipt | undefined {
        if (![wall, media, this.startWall, this.startUnix].every(Number.isFinite) || wall < this.startWall || media < 0)
            this.invalid = true;
        if (this.first) {
            this.first = false;
            if (media > 1500)
                this.invalid = true;
        }
        if (this.last) {
            const dt = wall - this.last.wall, dm = media - this.last.media;
            if (dt <= 0 || dt > 2500 || dm < 0 || dm > dt * 1.35 + 250 || dm < dt * .65 - 250)
                this.invalid = true;
            else if (dm > 0)
                this.observed += Math.min(dt, dm);
        }
        this.last = { wall, media };
        const elapsed = wall - this.startWall;
        if (this.invalid || elapsed > 30000 || media < 20000 || media >= 26000 || elapsed < 19000 || this.observed < 18000)
            return undefined;
        return { startedAtSec: Math.floor(this.startUnix / 1000), positionSec: Math.floor(media / 1000), realSec: Math.floor(this.observed / 1000), wallSec: Math.floor(elapsed / 1000) };
    }
}
