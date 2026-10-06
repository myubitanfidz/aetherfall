import Phaser from 'phaser';
import { SCENE_KEYS } from '@/config/constants';

export class UIScene extends Phaser.Scene {
  private fpsText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.UI });
  }

  create(): void {
    const { width } = this.scale;

    this.fpsText = this.add
      .text(width - 16, 16, 'FPS: --', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#6ee7ff',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);
  }

  update(): void {
    this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
  }
}