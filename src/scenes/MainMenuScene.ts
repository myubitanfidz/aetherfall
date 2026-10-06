import Phaser from 'phaser';
import { SCENE_KEYS, COLORS } from '@/config/constants';
import { SceneManager } from '@/core/SceneManager';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.MAIN_MENU });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG);
    this.createAmbient();
    this.createTitle();
    this.createMenu();
    this.createFooter();
  }

  private createAmbient(): void {
    const { width, height } = this.scale;

    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const dot = this.add.circle(x, y, Phaser.Math.Between(1, 2), 0x6ee7ff, 0.35);

      this.tweens.add({
        targets: dot,
        y: y - Phaser.Math.Between(30, 80),
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
        onRepeat: () => {
          dot.y = y;
          dot.alpha = 0.35;
        },
      });
    }
  }

  private createTitle(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    const title = this.add
      .text(cx, height * 0.28, 'AETHERFALL', {
        fontFamily: 'monospace',
        fontSize: '72px',
        fontStyle: 'bold',
        color: '#6ee7ff',
      })
      .setOrigin(0.5);

    title.setShadow(0, 0, '#6ee7ff', 16, false, true);

    this.add
      .text(cx, height * 0.38, '~ Echoes of the Rift ~', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#a0a0c0',
      })
      .setOrigin(0.5);
  }

  private createMenu(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.createButton(cx, height * 0.55, '[ MULAI PERJALANAN ]', () => {
      SceneManager.startGame(this);
    });

    this.createButton(
      cx,
      height * 0.65,
      '[ PENGATURAN ]',
      () => {
        // Akan diisi di Tahap 8
      },
      true
    );

    this.createButton(
      cx,
      height * 0.75,
      '[ KREDIT ]',
      () => {
        // Akan diisi nanti
      },
      true
    );
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    disabled = false
  ): Phaser.GameObjects.Text {
    const color = disabled ? '#3a3a52' : '#6ee7ff';
    const hoverColor = disabled ? '#3a3a52' : '#ffffff';

    const btn = this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color,
      })
      .setOrigin(0.5);

    if (disabled) {
      btn.setAlpha(0.6);
      return btn;
    }

    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      btn.setColor(hoverColor);
      this.tweens.add({
        targets: btn,
        scale: 1.05,
        duration: 120,
        ease: 'Quad.easeOut',
      });
    });

    btn.on('pointerout', () => {
      btn.setColor(color);
      this.tweens.add({
        targets: btn,
        scale: 1,
        duration: 120,
        ease: 'Quad.easeOut',
      });
    });

    btn.on('pointerdown', () => {
      this.tweens.add({
        targets: btn,
        scale: 0.95,
        duration: 80,
        yoyo: true,
        onComplete: onClick,
      });
    });

    return btn;
  }

  private createFooter(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height - 24, 'v0.0.1 — Tahap 1B', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#505068',
      })
      .setOrigin(0.5);
  }
}