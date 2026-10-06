import Phaser from 'phaser';
import { DEPTHS, ELEMENT_COLORS } from '@/config/constants';
import type { ElementType } from '@/types/combat';

/**
 * Popup angka damage saat entity kena hit.
 * Text kecil, naik pelan, memudar, lalu hancur.
 */
export class DamageNumberSystem {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Spawn angka damage di posisi x,y.
   * Arah naik sedikit acak supaya tidak menumpuk.
   */
  spawn(
    x: number,
    y: number,
    amount: number,
    element: ElementType,
    critical: boolean
  ): void {
    const offsetX = Phaser.Math.Between(-10, 10);
    const offsetY = Phaser.Math.Between(-6, 0);

    const color = ELEMENT_COLORS[element] ?? '#ffffff';
    const fontSize = critical ? '20px' : '15px';
    const prefix = critical ? '✦ ' : '';

    const text = this.scene.add
      .text(x + offsetX, y + offsetY, `${prefix}${amount}`, {
        fontFamily: 'monospace',
        fontSize,
        fontStyle: critical ? 'bold' : 'normal',
        color,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(DEPTHS.DAMAGE_NUMBER);

    // Naik + fade + scale pop.
    text.setScale(0.5);

    this.scene.tweens.add({
      targets: text,
      scale: 1,
      duration: 80,
      ease: 'Back.easeOut',
    });

    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 700,
      delay: 80,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  destroy(): void {
    // Tidak ada state yang perlu dibersihkan — text self-destruct via tween.
  }
}