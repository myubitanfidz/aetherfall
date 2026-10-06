import Phaser from 'phaser';
import { EventBus } from '@/core/EventBus';
import { EVENTS, DEPTHS } from '@/config/constants';
import type { DamageInfo, Faction } from '@/types/combat';

/**
 * Base class untuk semua objek bergerak yang punya HP.
 *
 * Sekarang entity sadar combat:
 * - Punya faction (player / enemy / neutral)
 * - Bisa menerima DamageInfo lengkap
 * - Punya i-frame (isInvulnerable, bisa di-override subclass)
 * - Punya knockback timer
 * - Ada hit flash visual
 */
export abstract class Entity extends Phaser.Physics.Arcade.Sprite {
  public hp: number;
  public maxHp: number;
  public isDead = false;
  public faction: Faction;

  /** Sisa waktu i-frame (ms). Subclass boleh mengubah. */
  protected iFrameMs = 0;

  /** Sisa waktu knockback (ms). Selama > 0, movement input diabaikan. */
  protected knockbackMs = 0;

  /** Warna tint asli sprite (untuk restore setelah hit flash). */
  private hitFlashTimer?: Phaser.Time.TimerEvent;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    maxHp: number,
    faction: Faction
  ) {
    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHp = maxHp;
    this.hp = maxHp;
    this.faction = faction;
    this.setDepth(DEPTHS.ENTITY);
    this.setCollideWorldBounds(true);
  }

  get isInvulnerable(): boolean {
    return this.iFrameMs > 0;
  }

  get isKnockedBack(): boolean {
    return this.knockbackMs > 0;
  }

  /**
   * Terima damage. Return true kalau entity mati karena damage ini.
   *
   * Alur:
   * 1. Cek i-frame → abaikan
   * 2. Kurangi HP
   * 3. Emit event ENTITY_DAMAGED
   * 4. Hit flash
   * 5. Knockback
   * 6. Kalau HP <= 0 → die
   */
  takeDamage(info: DamageInfo): boolean {
    if (this.isDead) return false;
    if (this.isInvulnerable) return false;

    const appliedAmount = Math.max(1, Math.round(info.amount));
    this.hp = Math.max(0, this.hp - appliedAmount);

    EventBus.emit(EVENTS.ENTITY_DAMAGED, {
      entity: this,
      amount: appliedAmount,
      info,
    });

    this.hitFlash();
    this.applyKnockbackFrom(info);

    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  heal(amount: number): void {
    if (this.isDead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  /** Beri i-frame selama durasi tertentu (ms). */
  grantInvulnerability(ms: number): void {
    this.iFrameMs = Math.max(this.iFrameMs, ms);
  }

  /** Hit flash: putih terang sebentar lalu balik normal. */
  protected hitFlash(): void {
    if (this.hitFlashTimer) {
      this.hitFlashTimer.remove();
    }

    this.setTintFill(0xffffff);
    this.hitFlashTimer = this.scene.time.delayedCall(70, () => {
      this.clearTint();
      this.hitFlashTimer = undefined;
    });
  }

  /**
   * Aplikasikan knockback dari DamageInfo. Arah didorong oleh
   * vektor dari sumber ke entity ini. Kalau tidak ada sumber,
   * arah horizontal acak.
   */
  protected applyKnockbackFrom(info: DamageInfo): void {
    if (info.knockbackForce <= 0) return;

    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    let dx = 1;
    let dy = 0;

    // Sumber bisa berupa Entity dengan posisi.
    const src = info.source as { x?: number; y?: number } | null;
    if (src && typeof src.x === 'number' && typeof src.y === 'number') {
      const ddx = this.x - src.x;
      const ddy = this.y - src.y;
      const len = Math.sqrt(ddx * ddx + ddy * ddy);
      if (len > 1e-6) {
        dx = ddx / len;
        dy = ddy / len;
      }
    }

    body.velocity.x = dx * info.knockbackForce;
    body.velocity.y = dy * info.knockbackForce;
    this.knockbackMs = 120;
  }

  protected die(): void {
    if (this.isDead) return;
    this.isDead = true;

    EventBus.emit(EVENTS.ENTITY_DIED, { entity: this });
    this.onDeath();
  }

  /**
   * Subclass bisa override untuk efek mati khusus.
   * Default: hancurkan sprite.
   */
  protected onDeath(): void {
    this.destroy();
  }

  /**
   * Update timer internal. Harus dipanggil di awal updateEntity subclass.
   * Return true kalau entity masih bisa update movement.
   */
  protected tickTimers(deltaMs: number): boolean {
    if (this.iFrameMs > 0) this.iFrameMs = Math.max(0, this.iFrameMs - deltaMs);

    if (this.knockbackMs > 0) {
      this.knockbackMs = Math.max(0, this.knockbackMs - deltaMs);
      return false; // sedang knockback, movement normal di-skip
    }
    return true;
  }

  abstract updateEntity(delta: number): void;
}