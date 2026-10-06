import Phaser from 'phaser';
import { SCENE_KEYS, DEPTHS, COLORS, TILE_SIZE } from '@/config/constants';
import { SceneManager } from '@/core/SceneManager';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG);
    this.createGrid();

    // Label debug kecil di pojok.
    this.add
      .text(16, 16, 'GameScene — Tahap 1B\nESC: kembali ke menu', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#6ee7ff',
        lineSpacing: 4,
      })
      .setScrollFactor(0)
      .setDepth(DEPTHS.UI);

    // UI scene dijalankan paralel — dia tidak menggantikan GameScene.
    this.scene.launch(SCENE_KEYS.UI);

    // ESC → kembali ke menu.
    this.input.keyboard?.on('keydown-ESC', () => {
      SceneManager.goToMainMenu(this);
    });

    // Bersihkan UIScene saat GameScene dimatikan (biar tidak dobel).
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.scene.isActive(SCENE_KEYS.UI)) {
        this.scene.stop(SCENE_KEYS.UI);
      }
    });
  }

  private createGrid(): void {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.lineStyle(1, 0x1a1a2e, 1);
    g.setDepth(DEPTHS.GROUND);

    for (let x = 0; x <= width; x += TILE_SIZE * 2) {
      g.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += TILE_SIZE * 2) {
      g.lineBetween(0, y, width, y);
    }
  }
}