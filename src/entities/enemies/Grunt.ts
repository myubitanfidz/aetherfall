import { Enemy } from '../Enemy';
import type { CombatSystem } from '@/systems/CombatSystem';
import type { Player } from '../Player';
import { normalize } from '@/utils/math';

/**
 * Grunt — musuh melee dasar.
 * Agresif, cepat, damage sedang. Serangannya telegraf jelas.
 */
export class Grunt extends Enemy {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    combat: CombatSystem,
    player: Player
  ) {
    super(scene, x, y, 'enemy_basic', 40, combat, player);

    // ---- Tuning Grunt ----
    this.sightRange = 320;
    this.attackRange = 42;
    this.moveSpeed = 105;
    this.attackWindup = 0.34;
    this.attackActive = 0.09;
    this.attackRecover = 0.38;
  }

  protected performAttack(): void {
    // Hitbox muncul di depan grunt, ke arah player.
    const n = normalize(this.player.x - this.x, this.player.y - this.y);
    const forwardOffset = 26;
    const hx = this.x + n.x * forwardOffset;
    const hy = this.y + n.y * forwardOffset;

    this.combat.spawnCircle({
      x: hx,
      y: hy,
      radius: 24,
      damage: {
        amount: 8,
        element: 'physical',
        source: this,
        sourceFaction: 'enemy',
        knockbackForce: 140,
        hitstopMs: 35,
        critical: false,
      },
      lifespanMs: this.attackActive * 1000,
      owner: this,
      singleHitPerTarget: true,
    });
  }
}