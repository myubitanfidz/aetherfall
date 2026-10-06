import Phaser from 'phaser';
import type { DamageInfo } from '@/types/combat';
import { DEPTHS, COLORS } from '@/config/constants';

/**
 * Hitbox lingkaran yang hidup selama beberapa ratus milidetik.
 *
 * Kenapa lingkaran, bukan persegi?
 * - Simpel: hanya butuh pusat + radius
 * - Tidak butuh rotasi
 * - Cek tabrakan dengan body persegi musuh mudah dan presisi
 *
 * Hitbox BUKAN Phaser GameObject. Ini objek data murni supaya bisa
 * di-pool dan diuji tanpa harus masuk ke scene tree.
 */
export class Hitbox {
  public x: number;
  public y: number;
  public radius: number;
  public damage: DamageInfo;
  public remainingMs: number;
  public singleHitPerTarget: boolean;
  public owner: unknown;

  /** Set target yang sudah kena, supaya tidak dobel hit. */
  public alreadyHit = new Set<unknown>();

  /** Grafis debug (hanya terlihat kalau debug mode aktif). */
  public debugGraphic?: Phaser.GameObjects.Arc;

  constructor(opts: {
    x: number;
    y: number;
    radius: number;
    damage: DamageInfo;
    lifespanMs: number;
    owner: unknown;
    singleHitPerTarget: boolean;
  }) {
    this.x = opts.x;
    this.y = opts.y;
    this.radius = opts.radius;
    this.damage = opts.damage;
    this.remainingMs = opts.lifespanMs;
    this.owner = opts.owner;
    this.singleHitPerTarget = opts.singleHitPerTarget;
  }

  /** Update posisi — dipakai kalau hitbox mengikuti pemilik. */
  moveTo(x: number, y: number): void {
    this.x = x;
    this.y = y;
    if (this.debugGraphic) {
      this.debugGraphic.setPosition(x, y);
    }
  }

  get isExpired(): boolean {
    return this.remainingMs <= 0;
  }

  /** True kalau target sudah pernah kena hitbox ini. */
  hasHit(target: unknown): boolean {
    return this.alreadyHit.has(target);
  }

  markHit(target: unknown): void {
    this.alreadyHit.add(target);
  }

  /**
   * Cek apakah lingkaran hitbox menabrak body persegi (AABB) dari sebuah sprite.
   * Ini circle vs rectangle test — akurat, tidak ada false positive.
   */
  overlapsRect(
    rectX: number,
    rectY: number,
    rectW: number,
    rectH: number
  ): boolean {
    // Cari titik terdekat pada rectangle ke pusat lingkaran.
    const halfW = rectW / 2;
    const halfH = rectH / 2;

    const left = rectX - halfW;
    const right = rectX + halfW;
    const top = rectY - halfH;
    const bottom = rectY + halfH;

    const closestX = Math.max(left, Math.min(this.x, right));
    const closestY = Math.max(top, Math.min(this.y, bottom));

    const dx = this.x - closestX;
    const dy = this.y - closestY;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  /** Buat grafis debug untuk ditampilkan saat debug aktif. */
  createDebugGraphic(scene: Phaser.Scene): void {
    const g = scene.add.circle(this.x, this.y, this.radius, COLORS.PRIMARY, 0.15);
    g.setStrokeStyle(1, COLORS.PRIMARY, 0.6);
    g.setDepth(DEPTHS.FX);
    this.debugGraphic = g;
  }

  destroy(): void {
    this.debugGraphic?.destroy();
    this.debugGraphic = undefined;
  }
}