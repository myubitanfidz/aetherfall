import Phaser from 'phaser';
import { Entity } from './Entity';
import { InputManager } from '@/core/InputManager';
import { damp, normalize } from '@/utils/math';
import { DEPTHS } from '@/config/constants';

// ---- Movement tuning ----
const MAX_SPEED = 220;
const SPRINT_MULTIPLIER = 1.5;
const ACCELERATION = 18;
const DECELERATION = 22;

// ---- Dash tuning ----
const DASH_SPEED = 720;
const DASH_DURATION = 0.18;      // detik
const DASH_COOLDOWN = 0.55;      // detik
const IFRAME_DURATION = 0.22;    // detik, sedikit lebih lama dari dash

export class Player extends Entity {
  private inputManager: InputManager;

  public facingX = 1;
  public facingY = 0;

  // State dash
  private dashRemaining = 0;
  private dashCooldown = 0;
  private iFrameRemaining = 0;
  private dashDirX = 1;
  private dashDirY = 0;

  // Visual
  private shadow!: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, x: number, y: number, input: InputManager) {
    super(scene, x, y, 'player', 100);
    this.inputManager = input;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 24);
    body.setOffset(4, 4);

    this.setDepth(DEPTHS.ENTITY);

    // Shadow: ellipse hitam transparan di bawah player.
    this.shadow = scene.add.ellipse(x, y + 10, 26, 12, 0x000000, 0.35);
    this.shadow.setDepth(DEPTHS.DECAL);

    // Bersihkan shadow saat player hancur.
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.shadow.destroy();
    });
  }

  get isInvulnerable(): boolean {
    return this.iFrameRemaining > 0;
  }

  get isDashing(): boolean {
    return this.dashRemaining > 0;
  }

  updateEntity(delta: number): void {
    if (this.isDead) return;

    const dt = delta / 1000;
    const s = this.inputManager.state;
    const body = this.body as Phaser.Physics.Arcade.Body;

    // ---- Timers ----
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.iFrameRemaining = Math.max(0, this.iFrameRemaining - dt);

    // ---- Update facing sebelum dash (dipakai kalau diam) ----
    if (s.moveX !== 0 || s.moveY !== 0) {
      const n = normalize(s.moveX, s.moveY);
      this.facingX = n.x;
      this.facingY = n.y;
    } else {
      const dx = s.aimWorldX - this.x;
      const dy = s.aimWorldY - this.y;
      const n = normalize(dx, dy);
      if (n.x !== 0 || n.y !== 0) {
        this.facingX = n.x;
        this.facingY = n.y;
      }
    }

    // ---- Dash logic ----
    if (this.dashRemaining > 0) {
      this.dashRemaining -= dt;
      body.velocity.x = this.dashDirX * DASH_SPEED;
      body.velocity.y = this.dashDirY * DASH_SPEED;

      // Visual: sedikit memudar saat dash.
      this.setAlpha(0.75);

      if (this.dashRemaining <= 0) {
        // Momentum: pertahankan sedikit kecepatan ke arah dash.
        body.velocity.x = this.dashDirX * MAX_SPEED;
        body.velocity.y = this.dashDirY * MAX_SPEED;
        this.setAlpha(1);
      }

      this.postUpdate();
      return;
    }

    // Trigger dash baru.
    if (s.dashPressed && this.dashCooldown <= 0) {
      this.startDash();
      this.postUpdate();
      return;
    }

    // ---- Normal movement ----
    const sprinting = s.sprintHeld;
    const targetSpeed = sprinting ? MAX_SPEED * SPRINT_MULTIPLIER : MAX_SPEED;
    const targetVX = s.moveX * targetSpeed;
    const targetVY = s.moveY * targetSpeed;

    const hasInput = s.moveX !== 0 || s.moveY !== 0;
    const smoothing = hasInput ? ACCELERATION : DECELERATION;

    body.velocity.x = damp(body.velocity.x, targetVX, smoothing, dt);
    body.velocity.y = damp(body.velocity.y, targetVY, smoothing, dt);

    // Reset alpha kalau sebelumnya dash.
    if (this.alpha !== 1) this.setAlpha(1);

    this.postUpdate();
  }

  private startDash(): void {
    // Arah dash: input arah kalau ada, else pakai facing.
    const s = this.inputManager.state;
    let dx = s.moveX;
    let dy = s.moveY;

    if (dx === 0 && dy === 0) {
      dx = this.facingX;
      dy = this.facingY;
    }

    const n = normalize(dx, dy);
    this.dashDirX = n.x;
    this.dashDirY = n.y;

    this.dashRemaining = DASH_DURATION;
    this.dashCooldown = DASH_COOLDOWN;
    this.iFrameRemaining = IFRAME_DURATION;
  }

  /**
   * Update hal-hal visual yang selalu perlu tiap frame.
   * Dipisah supaya tidak lupa dipanggil di semua cabang return.
   */
  private postUpdate(): void {
    this.shadow.setPosition(this.x, this.y + 10);
    this.setRotation(Math.atan2(this.facingY, this.facingX));
  }

  protected onDeath(): void {
    super.onDeath();
  }
}