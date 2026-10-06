import Phaser from 'phaser';
import { EventBus } from '@/core/EventBus';
import { EVENTS, DEPTHS } from '@/config/constants';

/**
 * Base class untuk semua objek bergerak yang punya HP.
 *
 * Kenapa extends Arcade.Sprite? Karena Phaser sudah menyediakan body
 * physics, texture, transform, dan lifecycle di dalamnya. Kita cukup
 * menambahkan konsep HP dan damage di atasnya.
 */
export abstract class Entity extends Phaser.Physics.Arcade.Sprite {
  public hp: number;
  public maxHp: number;
  public isDead = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    maxHp: number
  ) {
    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHp = maxHp;
    this.hp = maxHp;
    this.setDepth(DEPTHS.ENTITY);

    // Body default = ukuran sprite. Subclass boleh override.
    this.setCollideWorldBounds(true);
  }

  /**
   * Kurangi HP. Return true kalau entity mati karena damage ini.
   * Subclass bisa override untuk efek tambahan (hit flash, knockback).
   */
  takeDamage(amount: number, source?: Entity): boolean {
    if (this.isDead) return false;

    this.hp = Math.max(0, this.hp - amount);
    EventBus.emit(EVENTS.PLAYER_DAMAGED, { entity: this, amount, source });

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

  protected die(): void {
    this.isDead = true;
    this.onDeath();
  }

  /**
   * Subclass bisa override untuk animasi mati, drop loot, dsb.
   * Default: hancurkan sprite.
   */
  protected onDeath(): void {
    this.destroy();
  }

  /**
   * Subclass harus implementasi ini. Dipanggil dari GameScene.update().
   */
  abstract updateEntity(delta: number): void;
}