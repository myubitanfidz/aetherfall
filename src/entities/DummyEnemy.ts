import Phaser from 'phaser';
import { Entity } from './Entity';
import { DEPTHS } from '@/config/constants';

/**
 * Musuh dummy untuk latihan. Tidak punya AI — hanya berdiri,
 * menerima damage, dan mati.
 *
 * Nanti di Tahap 2B, ini akan digantikan oleh Enemy class
 * dengan AI state machine.
 */
export class DummyEnemy extends Entity {
  private shadow!: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy_basic', 40, 'enemy');

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 24);
    body.setOffset(4, 4);
    body.setImmovable(false);

    this.setDepth(DEPTHS.ENTITY);

    this.shadow = scene.add.ellipse(x, y + 10, 26, 12, 0x000000, 0.35);
    this.shadow.setDepth(DEPTHS.DECAL);

    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.shadow.destroy();
    });
  }

  updateEntity(_delta: number): void {
    if (this.isDead) return;
    this.tickTimers(_delta);
    this.shadow.setPosition(this.x, this.y + 10);
  }

  protected onDeath(): void {
    // Efek mati singkat: scale down + fade sebelum destroy.
    this.scene.tweens.add({
      targets: [this, this.shadow],
      alpha: 0,
      scale: 0.3,
      duration: 180,
      ease: 'Quad.easeIn',
      onComplete: () => {
        super.onDeath();
      },
    });
  }
}