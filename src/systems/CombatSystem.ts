import Phaser from 'phaser';
import { Hitbox } from '@/entities/Hitbox';
import { Entity } from '@/entities/Entity';
import { DEPTHS } from '@/config/constants';
import type { CircleHitboxOptions, DamageInfo } from '@/types/combat';

/**
 * Orkestrator combat.
 *
 * Tanggung jawab:
 * - Menyimpan daftar entity yang aktif
 * - Menyimpan hitbox yang hidup
 * - Setiap frame: cek tabrakan hitbox vs entity, terapkan damage
 * - Buang hitbox yang expired
 *
 * Tidak memutuskan kapan serangan terjadi — itu tugas Player/Enemy.
 * CombatSystem hanya menjalankan aturan.
 */
export class CombatSystem {
  private scene: Phaser.Scene;
  private entities = new Set<Entity>();
  private hitboxes: Hitbox[] = [];

  /** Kalau true, hitbox digambar sebagai lingkaran transparan. */
  public debugDraw = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ============================================================
  // REGISTRY
  // ============================================================

  registerEntity(entity: Entity): void {
    this.entities.add(entity);
    // Auto-unregister saat entity hancur.
    entity.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.entities.delete(entity);
    });
  }

  unregisterEntity(entity: Entity): void {
    this.entities.delete(entity);
  }

  getEntityCount(): number {
    return this.entities.size;
  }

  // ============================================================
  // HITBOX LIFECYCLE
  // ============================================================

  /**
   * Spawn hitbox lingkaran.
   * Pemanggil bertanggung jawab menyediakan semua parameter damage.
   */
  spawnCircle(opts: CircleHitboxOptions): Hitbox {
    const hitbox = new Hitbox({
      x: opts.x,
      y: opts.y,
      radius: opts.radius,
      damage: opts.damage,
      lifespanMs: opts.lifespanMs,
      owner: opts.owner,
      singleHitPerTarget: opts.singleHitPerTarget ?? true,
    });

    if (this.debugDraw) {
      hitbox.createDebugGraphic(this.scene);
    }

    this.hitboxes.push(hitbox);
    return hitbox;
  }

  /** Helper untuk membuat DamageInfo dengan default yang masuk akal. */
  static makeDamage(opts: Partial<DamageInfo> & { amount: number }): DamageInfo {
    return {
      amount: opts.amount,
      element: opts.element ?? 'physical',
      source: opts.source ?? null,
      sourceFaction: opts.sourceFaction ?? 'neutral',
      knockbackForce: opts.knockbackForce ?? 0,
      hitstopMs: opts.hitstopMs ?? 40,
      critical: opts.critical ?? false,
    };
  }

  // ============================================================
  // UPDATE
  // ============================================================

  update(deltaMs: number): void {
    // 1. Update lifetime setiap hitbox.
    // 2. Cek tabrakan.
    // 3. Tandai yang expired untuk dihapus.

    for (let i = this.hitboxes.length - 1; i >= 0; i--) {
      const hb = this.hitboxes[i];

      hb.remainingMs -= deltaMs;

      if (!hb.isExpired) {
        this.resolveHitbox(hb);
      }

      if (hb.isExpired) {
        hb.destroy();
        this.hitboxes.splice(i, 1);
      }
    }
  }

  private resolveHitbox(hb: Hitbox): void {
    for (const entity of this.entities) {
      if (entity.isDead) continue;
      if (entity === hb.owner) continue;

      // Faction check: hanya boleh memukul faksi yang berbeda,
      // kecuali salah satunya 'neutral'.
      if (
        entity.faction === hb.damage.sourceFaction &&
        entity.faction !== 'neutral'
      ) {
        continue;
      }

      if (hb.singleHitPerTarget && hb.hasHit(entity)) continue;

      // Ambil body rectangle.
      const body = entity.body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;

      const cx = body.center.x;
      const cy = body.center.y;
      const w = body.width;
      const h = body.height;

      if (!hb.overlapsRect(cx, cy, w, h)) continue;

      hb.markHit(entity);
      entity.takeDamage(hb.damage);
    }
  }

  // ============================================================
  // DEBUG
  // ============================================================

  setDebugDraw(enabled: boolean): void {
    this.debugDraw = enabled;

    // Buat / hapus grafis untuk hitbox yang sudah ada.
    for (const hb of this.hitboxes) {
      if (enabled && !hb.debugGraphic) {
        hb.createDebugGraphic(this.scene);
      } else if (!enabled && hb.debugGraphic) {
        hb.debugGraphic.destroy();
        hb.debugGraphic = undefined;
      }
    }
  }

  destroy(): void {
    for (const hb of this.hitboxes) hb.destroy();
    this.hitboxes.length = 0;
    this.entities.clear();
  }
}