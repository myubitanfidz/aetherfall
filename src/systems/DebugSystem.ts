import Phaser from 'phaser';
import { DEPTHS } from '@/config/constants';
import { Player } from '@/entities/Player';

/**
 * Overlay debug. Toggle dengan F1.
 * Menampilkan: FPS, posisi, velocity, HP. Dan mengaktifkan visual
 * physics body dari Phaser.
 */
export class DebugSystem {
  private scene: Phaser.Scene;
  private text: Phaser.GameObjects.Text;
  private enabled = false;
  private debugGraphic: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.text = scene.add
      .text(16, 60, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#6ee7ff',
        backgroundColor: '#00000088',
        padding: { x: 8, y: 6 },
        lineSpacing: 4,
      })
      .setScrollFactor(0)
      .setDepth(DEPTHS.UI)
      .setVisible(false);

    this.setupToggle();
  }

  private setupToggle(): void {
    this.scene.input.keyboard?.on('keydown-F1', (e: KeyboardEvent) => {
      e.preventDefault();
      this.toggle();
    });
  }

  private toggle(): void {
    this.enabled = !this.enabled;
    this.text.setVisible(this.enabled);

    const world = this.scene.physics.world;
    world.drawDebug = this.enabled;

    if (this.enabled) {
      if (!this.debugGraphic) {
        this.debugGraphic = world.createDebugGraphic();
        this.debugGraphic.setDepth(DEPTHS.FX);
      } else {
        this.debugGraphic.setVisible(true);
      }
    } else if (this.debugGraphic) {
      this.debugGraphic.clear();
      this.debugGraphic.setVisible(false);
    }
  }

  update(player: Player): void {
    if (!this.enabled) return;

    const body = player.body as Phaser.Physics.Arcade.Body;
    this.text.setText(
      [
        `FPS       : ${Math.round(this.scene.game.loop.actualFps)}`,
        `Player    : ${Math.round(player.x)}, ${Math.round(player.y)}`,
        `Velocity  : ${Math.round(body.velocity.x)}, ${Math.round(body.velocity.y)}`,
        `Speed     : ${Math.round(body.speed)} px/s`,
        `HP        : ${player.hp} / ${player.maxHp}`,
        `Facing    : ${player.facingX.toFixed(2)}, ${player.facingY.toFixed(2)}`,
      ].join('\n')
    );
  }

  destroy(): void {
    this.text.destroy();
    this.debugGraphic?.destroy();
  }
}