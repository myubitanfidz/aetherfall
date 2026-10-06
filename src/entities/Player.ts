import Phaser from 'phaser';
import { Entity } from './Entity';
import { InputManager } from '@/core/InputManager';
import { damp, normalize } from '@/utils/math';
import { DEPTHS, EVENTS } from '@/config/constants';
import { EventBus } from '@/core/EventBus';

// ---- Movement tuning ----
const MAX_SPEED = 220;
const SPRINT_MULTIPLIER = 1.5;
const ACCELERATION = 18;
const DECELERATION = 22;

// ---- Dash tuning ----
const DASH_SPEED = 720;
const DASH_DURATION = 0.18;
const DASH_COOLDOWN = 0.55;
const IFRAME_DURATION = 0.22;

// ---- Dust trigger ----
const STOP_SPEED_THRESHOLD = 40;    // px/s — di bawah ini dianggap diam
const STOP_DUST_COOLDOWN = 0.35;    // detik, biar tidak spam saat berhenti-gerak cepat

export class Player extends Entity {
  private inputManager: InputManager;

  public facingX = 1;
  public facingY = 0;

  // Dash state
  private dashRemaining = 0;
  private dashCooldown = 0;
  private iFrameRemaining = 0;
  private dashDirX = 1;
  private dashDirY = 0;

  // Stop-detection state
  private prevSpeed = 0;
  private stopCooldown = 0;

  // Visual
  private shadow!: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, x: number, y: number, input: InputManager) {
    super(scene, x, y, 'player', 100);
    this.inputManager = input;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 24);
    body.setOffset(4, 4);

    this.setDepth(DEPTHS.ENTITY);

    this.shadow = scene.add.ellipse(x, y + 10, 26, 12, 0x000000, 0.35);
    this.shadow.setDepth(DEPTHS.DECAL);

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

  /** 0..1, siap = 1, baru dipakai = 0. Untuk HUD. */
  get dashReadiness(): number {
    return 1 - this.dashCooldown / DASH_COOLDOWN;
  }

  updateEntity(delta: number): void {
    if (this.isDead) return;

    const dt = delta / 1000;
    const s = this.inputManager.state;
    const body = this.body as Phaser.Physics.Arcade.Body;

    // ---- Timers ----
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.iFrameRemaining = Math.max(0, this.iFrameRemaining - dt);
    this.stopCooldown = Math.max(0, this.stopCooldown - dt);

    // ---- Facing direction (dipakai untuk dash tanpa input) ----
    this.updateFacing();

    // ---- Pilih mode: dash, mulai dash, atau gerak normal ----
    if (this.dashRemaining > 0) {
      this.tickDash(dt, body);
    } else if (s.dashPressed && this.dashCooldown <= 0) {
      this.startDash();
      this.tickDash(dt, body);
    } else {
      this.tickNormalMovement(dt, body);
    }

    // ---- Deteksi berhenti mendadak ----
    this.checkStopEvent(dt, body);

    // ---- Visual sinkron ----
    this.postUpdate();
  }

  private updateFacing(): void {
    const s = this.inputManager.state;

    if (s.moveX !== 0 || s.moveY !== 0) {
      const n = normalize(s.moveX, s.moveY);
      this.facingX = n.x;
      this.facingY = n.y;
      return;
    }

    const dx = s.aimWorldX - this.x;
    const dy = s.aimWorldY - this.y;
    const n = normalize(dx, dy);
    if (n.x !== 0 || n.y !== 0) {
      this.facingX = n.x;
      this.facingY = n.y;
    }
  }

  private tickDash(dt: number, body: Phaser.Physics.Arcade.Body): void {
    this.dashRemaining -= dt;

    body.velocity.x = this.dashDirX * DASH_SPEED;
    body.velocity.y = this.dashDirY * DASH_SPEED;

    this.setAlpha(0.75);

    // Trail: minta EffectsSystem memancarkan partikel di posisi ini.
    EventBus.emit(EVENTS.PLAYER_DASH_TICK, {
      x: this.x,
      y: this.y,
      dirX: this.dashDirX,
      dirY: this.dashDirY,
    });

    if (this.dashRemaining <= 0) {
      // Keluar dari dash dengan sedikit momentum.
      body.velocity.x = this.dashDirX * MAX_SPEED;
      body.velocity.y = this.dashDirY * MAX_SPEED;
      this.setAlpha(1);
    }
  }

  private tickNormalMovement(dt: number, body: Phaser.Physics.Arcade.Body): void {
    const s = this.inputManager.state;
    const sprinting = s.sprintHeld;
    const targetSpeed = sprinting ? MAX_SPEED * SPRINT_MULTIPLIER : MAX_SPEED;

    const targetVX = s.moveX * targetSpeed;
    const targetVY = s.moveY * targetSpeed;

    const hasInput = s.moveX !== 0 || s.moveY !== 0;
    const smoothing = hasInput ? ACCELERATION : DECELERATION;

    body.velocity.x = damp(body.velocity.x, targetVX, smoothing, dt);
    body.velocity.y = damp(body.velocity.y, targetVY, smoothing, dt);

    if (this.alpha !== 1) this.setAlpha(1);
  }

  private startDash(): void {
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

    EventBus.emit(EVENTS.PLAYER_DASH_STARTED, {
      x: this.x,
      y: this.y,
      dirX: this.dashDirX,
      dirY: this.dashDirY,
    });
  }

  /**
   * Kalau sebelumnya bergerak cepat, lalu tiba-tiba pelan → dust burst.
   * Cooldown mencegah spam saat pemain zig-zag cepat.
   */
  private checkStopEvent(dt: number, body: Phaser.Physics.Arcade.Body): void {
    const speed = body.speed;

    if (
      this.prevSpeed > STOP_SPEED_THRESHOLD &&
      speed < STOP_SPEED_THRESHOLD &&
      this.stopCooldown <= 0
    ) {
      EventBus.emit(EVENTS.PLAYER_STOPPED, { x: this.x, y: this.y });
      this.stopCooldown = STOP_DUST_COOLDOWN;
    }

    this.prevSpeed = speed;
    void dt;
  }

  private postUpdate(): void {
    this.shadow.setPosition(this.x, this.y + 10);
    this.setRotation(Math.atan2(this.facingY, this.facingX));
  }

  protected onDeath(): void {
    super.onDeath();
  }
}