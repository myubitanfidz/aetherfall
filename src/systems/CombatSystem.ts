import Phaser from 'phaser';
import { Hitbox } from '@/entities/Hitbox';
import { Entity } from '@/entities/Entity';
import { Projectile, type ProjectileSpawnOptions } from '@/entities/Projectile';
import type { CircleHitboxOptions, DamageInfo } from '@/types/combat';

export class CombatSystem {
  private scene: Phaser.Scene;
  private entities = new Set<Entity>();
  private hitboxes: Hitbox[] = [];
  private projectiles: Projectile[] = [];

  public debugDraw = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ============================================================
  // REGISTRY
  // ============================================================

  registerEntity(entity: Entity): void {
    this.entities.add(entity);
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
  // SPAWN
  // ============================================================

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

  spawnProjectile(opts: ProjectileSpawnOptions): Projectile {
    const proj = new Projectile(this.scene, opts);
    this.projectiles.push(proj);

    proj.once(Phaser.GameObjects.Events.DESTROY, () => {
      const idx = this.projectiles.indexOf(proj);
      if (idx >= 0) this.projectiles.splice(idx, 1);
    });

    return proj;
  }

  static makeDamage(
    opts: Partial<DamageInfo> & { amount: number }
  ): DamageInfo {
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
    this.updateHitboxes(deltaMs);
    this.updateProjectiles(deltaMs);
  }

  private updateHitboxes(deltaMs: number): void {
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

  private updateProjectiles(deltaMs: number): void {
    const bounds = this.scene.physics.world.bounds;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      if (!p.active) {
        this.projectiles.splice(i, 1);
        continue;
      }

      p.tickLifetime(deltaMs);

      // Out-of-bounds → fade out.
      if (
        p.x < bounds.left ||
        p.x > bounds.right ||
        p.y < bounds.top ||
        p.y > bounds.bottom
      ) {
        p.fadeOut();
        continue;
      }

      this.resolveProjectile(p);
    }
  }

  // ============================================================
  // RESOLUTION
  // ============================================================

  private resolveHitbox(hb: Hitbox): void {
    for (const entity of this.entities) {
      if (entity.isDead) continue;
      if (entity === hb.owner) continue;

      if (
        entity.faction === hb.damage.sourceFaction &&
        entity.faction !== 'neutral'
      ) {
        continue;
      }

      if (hb.singleHitPerTarget && hb.hasHit(entity)) continue;

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

  private resolveProjectile(p: Projectile): void {
    for (const entity of this.entities) {
      if (entity.isDead) continue;
      if (entity === p.owner) continue;

      if (
        entity.faction === p.damage.sourceFaction &&
        entity.faction !== 'neutral'
      ) {
        continue;
      }

      if (p.hasHit(entity)) continue;

      // I-frame → projectile lewat tanpa efek.
      // Ini yang bikin dash menembus peluru terasa memuaskan.
      if (entity.isInvulnerable) continue;

      const body = entity.body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;

      // Circle vs AABB.
      const halfW = body.width / 2;
      const halfH = body.height / 2;
      const ex = body.center.x;
      const ey = body.center.y;

      const nearestX = Phaser.Math.Clamp(p.x, ex - halfW, ex + halfW);
      const nearestY = Phaser.Math.Clamp(p.y, ey - halfH, ey + halfH);

      const dx = p.x - nearestX;
      const dy = p.y - nearestY;

      if (dx * dx + dy * dy > p.radius * p.radius) continue;

      p.registerHit(entity);
      entity.takeDamage(p.damage);
      p.fadeOut();
      return;
    }
  }

  // ============================================================
  // DEBUG
  // ============================================================

  setDebugDraw(enabled: boolean): void {
    this.debugDraw = enabled;

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

    for (const p of this.projectiles) p.destroy();
    this.projectiles.length = 0;

    this.entities.clear();
  }
}