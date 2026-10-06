import Phaser from 'phaser';
import { EventBus } from '@/core/EventBus';
import { EVENTS, DEPTHS, COLORS } from '@/config/constants';

interface DashPayload {
  x: number;
  y: number;
  dirX: number;
  dirY: number;
}

interface StopPayload {
  x: number;
  y: number;
}

/**
 * Semua efek visual non-gameplay (partikel, trail, dust).
 * Terpisah dari Player supaya Player tidak tahu soal grafis.
 *
 * Mendengarkan event dari EventBus. Kalau mau matikan semua efek,
 * cukup destroy sistem ini.
 */
export class EffectsSystem {
  private dashTrail: Phaser.GameObjects.Particles.ParticleEmitter;
  private dustBurst: Phaser.GameObjects.Particles.ParticleEmitter;
  private dashStartFlash: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {

    // ---- Dash trail: partikel cyan kecil yang memudar cepat ----
    this.dashTrail = scene.add.particles(0, 0, 'particle', {
      lifespan: 220,
      speed: { min: -20, max: 20 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.75, end: 0 },
      tint: COLORS.PRIMARY,
      blendMode: 'ADD',
      emitting: false,
    });
    this.dashTrail.setDepth(DEPTHS.FX);

    // ---- Dust burst: saat berhenti mendadak ----
    this.dustBurst = scene.add.particles(0, 0, 'particle', {
      lifespan: 380,
      speed: { min: 30, max: 90 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.55, end: 0 },
      tint: 0x8899bb,
      emitting: false,
    });
    this.dustBurst.setDepth(DEPTHS.DECAL);

    // ---- Dash start flash: burst kecil di posisi mulai ----
    this.dashStartFlash = scene.add.particles(0, 0, 'particle', {
      lifespan: 280,
      speed: { min: 60, max: 140 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.4, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: COLORS.PRIMARY,
      blendMode: 'ADD',
      emitting: false,
    });
    this.dashStartFlash.setDepth(DEPTHS.FX);

    // ---- Listeners ----
    EventBus.on(EVENTS.PLAYER_DASH_STARTED, this.onDashStarted, this);
    EventBus.on(EVENTS.PLAYER_DASH_TICK, this.onDashTick, this);
    EventBus.on(EVENTS.PLAYER_STOPPED, this.onStopped, this);
  }

  private onDashStarted(p: DashPayload): void {
    // Burst 6 partikel ke semua arah saat dash dimulai.
    this.dashStartFlash.emitParticleAt(p.x, p.y, 6);
  }

  private onDashTick(p: DashPayload): void {
    // 1 partikel per frame selama dash. Karena durasi dash ~0.18s,
    // total ~10 partikel — cukup untuk trail tanpa bikin berat.
    this.dashTrail.emitParticleAt(p.x, p.y, 1);
  }

  private onStopped(p: StopPayload): void {
    this.dustBurst.emitParticleAt(p.x, p.y, 8);
  }

  update(_delta: number): void {
    // Tidak ada yang perlu di-update tiap frame untuk saat ini.
    // Slot ini disiapkan kalau nanti butuh efek yang bergantung waktu.
  }

  destroy(): void {
    EventBus.off(EVENTS.PLAYER_DASH_STARTED, this.onDashStarted, this);
    EventBus.off(EVENTS.PLAYER_DASH_TICK, this.onDashTick, this);
    EventBus.off(EVENTS.PLAYER_STOPPED, this.onStopped, this);

    this.dashTrail.destroy();
    this.dustBurst.destroy();
    this.dashStartFlash.destroy();
  }
}