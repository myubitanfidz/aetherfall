import { EventBus } from '@/core/EventBus';
import { EVENTS } from '@/config/constants';

/**
 * HitStop = freeze singkat saat impact untuk memberi "rasa" pada serangan.
 * Biasanya 30–80ms. Efeknya: seolah dunia menahan napas sejenak.
 *
 * Sistem ini HANYA mengelola timer. Yang memutuskan kapan freeze dan
 * kapan tidak adalah GameScene, yang mengecek `isFrozen`.
 *
 * Cara pakai dari sistem lain:
 *   EventBus.emit(EVENTS.HITSTOP_REQUEST, 60); // 60ms
 */
export class HitStopSystem {
  private remainingMs = 0;
  private maxMs = 0;

  constructor() {
    EventBus.on(EVENTS.HITSTOP_REQUEST, this.request, this);
  }

  /** Terima permintaan hitstop. Durasi lebih besar menang. */
  private request(durationMs: number): void {
    if (durationMs > this.remainingMs) {
      this.remainingMs = durationMs;
      this.maxMs = durationMs;
    }
  }

  update(deltaMs: number): void {
    if (this.remainingMs > 0) {
      this.remainingMs = Math.max(0, this.remainingMs - deltaMs);
    }
  }

  get isFrozen(): boolean {
    return this.remainingMs > 0;
  }

  /** 0..1, seberapa dekat hitstop ke selesai. Berguna untuk efek visual. */
  get progress(): number {
    if (this.maxMs === 0) return 1;
    return 1 - this.remainingMs / this.maxMs;
  }

  destroy(): void {
    EventBus.off(EVENTS.HITSTOP_REQUEST, this.request, this);
  }
}