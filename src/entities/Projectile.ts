import Phaser from 'phaser';
import { DEPTHS } from '@/config/constants';
import type { DamageInfo } from '@/types/combat';

export interface ProjectileSpawnOptions {
  x: number;
  y: number;
  angle: number;
  speed: number;
  damage: DamageInfo;
  lifespanMs: number;
  owner: unknown;
  texture?: string;
  /** Radius untuk tabrakan manual (circle vs AABB). Default 5. */
  radius?: number;
}

/**
 * Peluru generik. Bergerak lurus, damage pada kontak, self-destruct.
 *
 * Tidak extend Entity karena:
 * - Tidak punya HP
 * - Tidak punya AI
 * - Tidak butuh faction sendiri (faction-nya ada di DamageInfo)
 *
 * Menggunakan Arcade body untuk gerakan, tapi tabrakan diselesaikan
 * oleh CombatSystem (konsisten dengan sistem hitbox).
 */
export class Projectile extends Phaser.Physics.Arcade.Sprite {
  public damage: DamageInfo;
  public remainingMs: number;
  public owner: unknown;
  public radius: number;

  private alreadyHit = new Set<unknown>();
  private isFading = false;

  constructor(scene: Phaser.Scene, opts: ProjectileSpawnOptions) {
    super(scene, opts.x, opts.y, opts.texture ?? 'projectile');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.damage = opts.damage;
    this.remainingMs = opts.lifespanMs;
    this.owner = opts.owner;
    this.radius = opts.radius ?? 5;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);

    scene.physics.velocityFromRotation(
      opts.angle,
      opts.speed,
      body.velocity
    );

    this.setRotation(opts.angle);
    this.setDepth(DEPTHS.PROJECTILE);
  }

  /** Kurangi lifetime. Dipanggil CombatSystem tiap frame. */
  tickLifetime(deltaMs: number): void {
    if (this.isFading) return;
    this.remainingMs -= deltaMs;
    if (this.remainingMs <= 0) this.fadeOut();
  }

  hasHit(target: unknown): boolean {
    return this.alreadyHit.has(target);
  }

  registerHit(target: unknown): void {
    this.alreadyHit.add(target);
  }

  /**
   * Fade + scale down, lalu destroy. Idempotent — aman dipanggil
   * berkali-kali (out-of-bounds dan on-hit bisa bentrok).
   */
  fadeOut(): void {
    if (this.isFading || !this.active) return;
    this.isFading = true;

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.4,
      duration: 100,
      ease: 'Quad.easeOut',
      onComplete: () => this.destroy(),
    });
  }
}