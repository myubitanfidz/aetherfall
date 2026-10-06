import Phaser from 'phaser';
import { SCENE_KEYS, TILE_SIZE, COLORS } from '@/config/constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  create(): void {
    this.createPlaceholderTextures();
    this.scene.start(SCENE_KEYS.PRELOAD);
  }

  /**
   * Kita buat tekstur sederhana lewat Graphics, generate ke texture key,
   * lalu hancurkan Graphics-nya. Ini trik klasik Phaser untuk prototyping
   * tanpa file gambar.
   *
   * Nanti saat aset asli sudah ada, cukup comment bagian ini dan ganti
   * ke `this.load.image(...)` di PreloadScene.
   */
  private createPlaceholderTextures(): void {
    // Player: kotak cyan 32x32
    this.makeRectTexture('player', TILE_SIZE, TILE_SIZE, COLORS.PRIMARY);

    // Musuh dasar: kotak merah 32x32
    this.makeRectTexture('enemy_basic', TILE_SIZE, TILE_SIZE, COLORS.DANGER);

    // Partikel: kotak kecil 4x4 putih
    this.makeRectTexture('particle', 4, 4, 0xffffff);

    // Peluru: kotak 8x8 kuning
    this.makeRectTexture('projectile', 8, 8, COLORS.GOLD);

    // Tile lantai: kotak 32x32 dengan sedikit garis tepi
    this.makeTileTexture('tile_floor', TILE_SIZE, TILE_SIZE, 0x1a1a2e, 0x252540);
  }

  private makeRectTexture(key: string, w: number, h: number, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeTileTexture(
    key: string,
    w: number,
    h: number,
    fill: number,
    border: number
  ): void {
    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    g.fillRect(0, 0, w, h);
    g.lineStyle(1, border, 1);
    g.strokeRect(0.5, 0.5, w - 1, h - 1);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}