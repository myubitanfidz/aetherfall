import Phaser from 'phaser';
import { SCENE_KEYS, COLORS } from '@/config/constants';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.MAIN_MENU });
  }
  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG);
    this.add.text(640, 360, 'AETHERFALL', {
      fontFamily: 'monospace',
      fontSize: '72px',
      color: '#6ee7ff',
    }).setOrigin(0.5);
  }
}