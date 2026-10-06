import Phaser from 'phaser';
import { SCENE_KEYS, COLORS } from '@/config/constants';

export class PreloadScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private percentText!: Phaser.GameObjects.Text;

  private readonly BAR_WIDTH = 400;
  private readonly BAR_HEIGHT = 22;

  constructor() {
    super({ key: SCENE_KEYS.PRELOAD });
  }

  preload(): void {
    this.createUI();

    // Daftarkan listener sebelum load dimulai.
    this.load.on(Phaser.Loader.Events.PROGRESS, this.onProgress, this);
    this.load.on(Phaser.Loader.Events.COMPLETE, this.onComplete, this);

    // ============================================
    // Di sini nanti kita load aset asli, contoh:
    // this.load.image('tileset', 'assets/sprites/tileset.png');
    // this.load.audio('bgm_menu', 'assets/audio/bgm_menu.mp3');
    // this.load.tilemapTiledJSON('dungeon', 'assets/maps/dungeon.json');
    // ============================================
    // Untuk sekarang kosong. Phaser tetap akan fire 'complete'.
  }

  private createUI(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.cameras.main.setBackgroundColor(COLORS.BG);

    this.loadingText = this.add
      .text(cx, cy - 50, 'MEMUAT...', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#6ee7ff',
      })
      .setOrigin(0.5);

    this.progressBox = this.add.graphics();
    this.progressBox.lineStyle(2, COLORS.PRIMARY, 1);
    this.progressBox.strokeRect(
      cx - this.BAR_WIDTH / 2,
      cy - this.BAR_HEIGHT / 2,
      this.BAR_WIDTH,
      this.BAR_HEIGHT
    );

    this.progressBar = this.add.graphics();

    this.percentText = this.add
      .text(cx, cy + 40, '0%', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#a0a0c0',
      })
      .setOrigin(0.5);
  }

  private onProgress(value: number): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.progressBar.clear();
    this.progressBar.fillStyle(COLORS.PRIMARY, 1);
    this.progressBar.fillRect(
      cx - this.BAR_WIDTH / 2 + 2,
      cy - this.BAR_HEIGHT / 2 + 2,
      (this.BAR_WIDTH - 4) * value,
      this.BAR_HEIGHT - 4
    );

    this.percentText.setText(`${Math.round(value * 100)}%`);
  }

  private onComplete(): void {
    this.loadingText.setText('SIAP');
    this.percentText.setText('100%');

    // Delay kecil biar transisi tidak terlalu kaget.
    this.time.delayedCall(250, () => {
      this.scene.start(SCENE_KEYS.MAIN_MENU);
    });
  }
}