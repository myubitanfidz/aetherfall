import Phaser from 'phaser';
import { SCENE_KEYS, COLORS } from '@/config/constants';
import type { GameScene } from './GameScene';

const PANEL_X = 16;
const PANEL_Y = 16;
const HP_BAR_W = 240;
const HP_BAR_H = 18;
const DASH_BAR_W = 240;
const DASH_BAR_H = 6;

/**
 * HUD overlay. Jalan paralel di atas GameScene.
 * Membaca state player dari GameScene setiap frame.
 *
 * Cara pass reference: GameScene memanggil
 *   this.scene.launch(SCENE_KEYS.UI, { gameScene: this });
 * dan UIScene menerimanya di init().
 */
export class UIScene extends Phaser.Scene {
  private gameScene!: GameScene;

  private hpFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private dashFill!: Phaser.GameObjects.Rectangle;
  private portrait!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: SCENE_KEYS.UI });
  }

  init(data: { gameScene: GameScene }): void {
    this.gameScene = data.gameScene;
  }

  create(): void {
    this.createPanel();
    this.createBars();
  }

  private createPanel(): void {
    // Portrait kotak di kiri.
    this.portrait = this.add
      .rectangle(PANEL_X + 24, PANEL_Y + 28, 48, 48, COLORS.PRIMARY)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(2, COLORS.PANEL_BORDER);

    // Outline panel transparan di belakang semua.
    this.add
      .rectangle(
        PANEL_X,
        PANEL_Y,
        HP_BAR_W + 80,
        64,
        COLORS.PANEL_BG,
        0.55
      )
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.PANEL_BORDER);
  }

  private createBars(): void {
    const barX = PANEL_X + 56;
    const hpY = PANEL_Y + 20;
    const dashY = PANEL_Y + 46;

    // ---- HP bar ----
    this.add
      .rectangle(barX, hpY, HP_BAR_W, HP_BAR_H, 0x000000, 0.5)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, COLORS.PANEL_BORDER);

    this.hpFill = this.add
      .rectangle(barX + 1, hpY, HP_BAR_W - 2, HP_BAR_H - 2, COLORS.DANGER)
      .setOrigin(0, 0.5);

    this.hpText = this.add
      .text(barX + HP_BAR_W / 2, hpY, '100 / 100', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // ---- Dash bar ----
    this.add
      .rectangle(barX, dashY, DASH_BAR_W, DASH_BAR_H, 0x000000, 0.5)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, COLORS.PANEL_BORDER);

    this.dashFill = this.add
      .rectangle(barX + 1, dashY, DASH_BAR_W - 2, DASH_BAR_H - 2, COLORS.PRIMARY)
      .setOrigin(0, 0.5);
  }

  update(): void {
    if (!this.gameScene || !this.gameScene.scene.isActive()) return;

    const player = this.gameScene.getPlayer();
    if (!player) return;

    // ---- HP ----
    const hpRatio = Phaser.Math.Clamp(player.hp / player.maxHp, 0, 1);
    this.hpFill.setScale(hpRatio, 1);

    // Warna HP: merah (low) → hijau (full).
    const color = this.interpolateHpColor(hpRatio);
    this.hpFill.setFillStyle(color);

    this.hpText.setText(
      `${Math.ceil(player.hp)} / ${player.maxHp}`
    );

    // ---- Dash ----
    const dashRatio = Phaser.Math.Clamp(player.dashReadiness, 0, 1);
    this.dashFill.setScale(dashRatio, 1);
    this.dashFill.setFillStyle(
      dashRatio >= 1 ? COLORS.PRIMARY : COLORS.MUTED
    );

    // Portrait berkedip saat i-frame.
    this.portrait.setAlpha(player.isInvulnerable ? 0.5 : 1);
  }

  /**
   * Interpolasi warna dari merah ke hijau. Dipakai untuk HP bar.
   * Phaser menyediakan helper interpolate — kita tinggal pakai.
   */
  private interpolateHpColor(ratio: number): number {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(COLORS.DANGER),
      Phaser.Display.Color.ValueToColor(COLORS.SUCCESS),
      100,
      Math.round(ratio * 100)
    );
    return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
  }
}