import { Enemy } from '../Enemy';
import type { CombatSystem } from '@/systems/CombatSystem';
import type { Player } from '../Player';
import { normalize } from '@/utils/math';

/**
 * Shooter — musuh ranged.
 * Jaga jarak ideal, tembak peluru dari jauh.
 * Warna ungu untuk bedakan dari Grunt.
 */
export class Shooter extends Enemy {
  /** Jarak ideal dari player yang coba dipertahankan. */
  private preferredDistance = 220;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    combat: CombatSystem,
    player: Player
  ) {
    super(scene, x, y, 'enemy_basic', 28, combat, player);

    // Tint ungu.
    this.setTint(0xa06aff);

    // ---- Tuning Shooter ----
    this.sightRange = 420;
    this.attackRange = 300;
    this.minAttackRange = 130;   // tidak menyerang kalau player terlalu dekat
    this.moveSpeed = 75;
    this.attackWindup = 0.5;     // telegraph lebih lama
    this.attackActive = 0.05;
    this.attackRecover = 0.6;
  }

  /**
   * Jaga jarak: terlalu dekat → mundur, terlalu jauh → maju,
   * di zona nyaman → diam.
   */
  protected getChaseVelocity(dist: number): { x: number; y: number } {
    const n = normalize(this.player.x - this.x, this.player.y - this.y);
    const buffer = 40;

    if (dist < this.preferredDistance - buffer) {
      // Terlalu dekat — mundur.
      return { x: -n.x * this.moveSpeed, y: -n.y * this.moveSpeed };
    }
    if (dist > this.preferredDistance + buffer) {
      // Terlalu jauh — maju.
      return { x: n.x * this.moveSpeed, y: n.y * this.moveSpeed };
    }

    // Zona nyaman — diam.
    return { x: 0, y: 0 };
  }

  protected performAttack(): void {
    const angle = Math.atan2(
      this.player.y - this.y,
      this.player.x - this.x
    );

    const spawnDist = 18;

    this.combat.spawnProjectile({
      x: this.x + Math.cos(angle) * spawnDist,
      y: this.y + Math.sin(angle) * spawnDist,
      angle,
      speed: 300,
      lifespanMs: 2500,
      owner: this,
      damage: {
        amount: 6,
        element: 'fire',
        source: this,
        sourceFaction: 'enemy',
        knockbackForce: 90,
        hitstopMs: 30,
        critical: false,
      },
    });
  }
}