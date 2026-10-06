import Phaser from 'phaser';
import { Entity } from './Entity';
import { InputManager } from '@/core/InputManager';
import { damp, normalize } from '@/utils/math';
import { DEPTHS } from '@/config/constants';

// Tuning movement. Angka-angka ini yang bikin "rasa" movement.
const MAX_SPEED = 220;        // px/detik
const ACCELERATION = 18;       // semakin besar, semakin instan berakselerasi
const DECELERATION = 22;       // semakin besar, semakin cepat berhenti

export class Player extends Entity {
  private inputManager: InputManager;

  // Arah hadap (dipakai nanti untuk serangan).
  public facingX = 1;
  public facingY = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, inputManager: InputManager) {
    super(scene, x, y, 'player', 100);
    this.inputManager = inputManager;

    // Body lebih kecil dari sprite supaya "kaki" saja yang collide.
    // Ini standar untuk action game top-down.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 24);
    body.setOffset(4, 6);

    // Drag dasar supaya tidak sliding.
    body.setDamping(true);
    body.setDrag(0.001, 0.001); // dikombinasikan dengan damp() manual

    this.setDepth(DEPTHS.ENTITY);
  }

  updateEntity(delta: number): void {
    if (this.isDead) return;

    const dt = delta / 1000;
    const s = this.inputManager.state;

    // ---- Target velocity ----
    const targetVX = s.moveX * MAX_SPEED;
    const targetVY = s.moveY * MAX_SPEED;

    // ---- Smooth velocity ----
    // Kalau ada input, pakai ACCELERATION. Kalau tidak, pakai DECELERATION.
    const smoothing = s.moveX !== 0 || s.moveY !== 0 ? ACCELERATION : DECELERATION;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.velocity.x = damp(body.velocity.x, targetVX, smoothing, dt);
    body.velocity.y = damp(body.velocity.y, targetVY, smoothing, dt);

    // ---- Facing direction ----
    // Prioritas: arah gerak. Kalau diam, arah aim.
    if (s.moveX !== 0 || s.moveY !== 0) {
      const n = normalize(s.moveX, s.moveY);
      this.facingX = n.x;
      this.facingY = n.y;
    } else {
      // Aim relatif terhadap player.
      const dx = s.aimWorldX - this.x;
      const dy = s.aimWorldY - this.y;
      const n = normalize(dx, dy);
      if (n.x !== 0 || n.y !== 0) {
        this.facingX = n.x;
        this.facingY = n.y;
      }
    }

    // ---- Rotation visual ----
    // Sementara, putar sprite supaya arah hadap terlihat jelas.
    // Nanti saat ada sprite asli, kita ganti ke animasi.
    this.setRotation(Math.atan2(this.facingY, this.facingX));
  }

  protected onDeath(): void {
    super.onDeath();
    // Nanti: animasi mati, drop loot, pindah ke game over scene.
  }
}