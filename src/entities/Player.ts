import Phaser from 'phaser';
import { Entity } from './Entity';
import { InputManager } from '@/core/InputManager';
import { damp, normalize } from '@/utils/math';
import { DEPTHS, EVENTS } from '@/config/constants';
import { EventBus } from '@/core/EventBus';
import type { CombatSystem } from '@/systems/CombatSystem';

// ---- Movement ----
const MAX_SPEED = 220;
const SPRINT_MULTIPLIER = 1.5;
const ACCELERATION = 18;
const DECELERATION = 22;

// ---- Dash ----
const DASH_SPEED = 720;
const DASH_DURATION = 0.18;
const DASH_COOLDOWN = 0.55;
const IFRAME_DURATION = 0.22;

// ---- Attack ----
const ATTACK_COOLDOWN = 0.35;      // detik, dari awal hingga bisa attack lagi
const ATTACK_WINDUP = 0.06;        // detik sebelum hitbox muncul
const ATTACK_ACTIVE = 0.10;        // detik hitbox aktif
const ATTACK_RECOVER = 0.14;       // detik setelah hitbox hilang sebelum bisa gerak penuh
const ATTACK_MOVE_MULT = 0.35;     // movement diperlambat saat attack
const ATTACK_RANGE = 34;           // px, jarak dari pusat player ke pusat hitbox
const ATTACK_RADIUS = 26;          // px, radius hitbox
const ATTACK_DAMAGE = 12;
const ATTACK_KNOCKBACK = 180;
const ATTACK_HITSTOP = 55;

// ---- Stop dust ----
const STOP_SPEED_THRESHOLD = 40;
const STOP_DUST_COOLDOWN = 0.35;

type AttackPhase = 'idle' | 'windup' | 'active' | 'recover';

export class Player extends Entity {
  private inputManager: InputManager;
  private combat: CombatSystem;

  public facingX = 1;
  public facingY = 0;

  // Dash state
  private dashRemaining = 0;
  private dashCooldown = 0;
  private dashDirX = 1;
  private dashDirY = 0;

  // Attack state
  private attackPhase: AttackPhase = 'idle';
  private attackTimer = 0;
  private attackCooldown = 0;

  // Stop dust
  private prevSpeed = 0;
  private stopCooldown = 0;

  // Visual
  private shadow!: Phaser.GameObjects.Ellipse;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    input: InputManager,
    combat: CombatSystem
  ) {
    super(scene, x, y, 'player', 100, 'player');
    this.inputManager = input;
    this.combat = combat;

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

  get isDashing(): boolean {
    return this.dashRemaining > 0;
  }

  get isAttacking(): boolean {
    return this.attackPhase !== 'idle';
  }

  get dashReadiness(): number {
    return 1 - this.dashCooldown / DASH_COOLDOWN;
  }

  updateEntity(delta: number): void {
    if (this.isDead) return;

    const dt = delta / 1000;
    const s = this.inputManager.state;
    const body = this.body as Phaser.Physics.Arcade.Body;

    // ---- Timers dasar ----
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.stopCooldown = Math.max(0, this.stopCooldown - dt);

    // ---- tickTimers mengurus i-frame & knockback ----
    const canMove = this.tickTimers(delta);

    // ---- Facing direction ----
    this.updateFacing();

    // ---- Attack state machine (prioritas setelah dash) ----
    this.tickAttack(dt);

    // ---- Dash ----
    if (this.dashRemaining > 0) {
      this.tickDash(dt, body);
    } else if (s.dashPressed && this.dashCooldown <= 0 && !this.isAttacking) {
      this.startDash();
      this.tickDash(dt, body);
    } else if (canMove) {
      this.tickMovement(dt, body);
    } else {
      // Knockback — kurangi velocity pelan-pelan supaya tidak sliding.
      body.velocity.x *= 0.9;
      body.velocity.y *= 0.9;
    }

    // ---- Stop dust ----
    this.checkStopEvent(body);

    // ---- Visual ----
    this.postUpdate();
  }

  // ============================================================
  // FACING
  // ============================================================

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

  // ============================================================
  // MOVEMENT
  // ============================================================

  private tickMovement(dt: number, body: Phaser.Physics.Arcade.Body): void {
    const s = this.inputManager.state;
    const sprinting = s.sprintHeld && !this.isAttacking;
    const baseSpeed = sprinting ? MAX_SPEED * SPRINT_MULTIPLIER : MAX_SPEED;
    const targetSpeed = this.isAttacking ? baseSpeed * ATTACK_MOVE_MULT : baseSpeed;

    const targetVX = s.moveX * targetSpeed;
    const targetVY = s.moveY * targetSpeed;

    const hasInput = s.moveX !== 0 || s.moveY !== 0;
    const smoothing = hasInput ? ACCELERATION : DECELERATION;

    body.velocity.x = damp(body.velocity.x, targetVX, smoothing, dt);
    body.velocity.y = damp(body.velocity.y, targetVY, smoothing, dt);

    if (this.alpha !== 1) this.setAlpha(1);
  }

  private tickDash(dt: number, body: Phaser.Physics.Arcade.Body): void {
    this.dashRemaining -= dt;

    body.velocity.x = this.dashDirX * DASH_SPEED;
    body.velocity.y = this.dashDirY * DASH_SPEED;

    this.setAlpha(0.75);

    EventBus.emit(EVENTS.PLAYER_DASH_TICK, {
      x: this.x,
      y: this.y,
      dirX: this.dashDirX,
      dirY: this.dashDirY,
    });

    if (this.dashRemaining <= 0) {
      body.velocity.x = this.dashDirX * MAX_SPEED;
      body.velocity.y = this.dashDirY * MAX_SPEED;
      this.setAlpha(1);
    }
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
    this.iFrameMs = IFRAME_DURATION * 1000;

    EventBus.emit(EVENTS.PLAYER_DASH_STARTED, {
      x: this.x,
      y: this.y,
      dirX: this.dashDirX,
      dirY: this.dashDirY,
    });
  }

  // ============================================================
  // ATTACK
  // ============================================================

  private tickAttack(dt: number): void {
    const s = this.inputManager.state;

    // Bisa mulai attack baru hanya kalau:
    // - sedang idle (bukan attacking, bukan dashing)
    // - cooldown sudah 0
    // - tombol attack ditekan (edge)
    if (
      this.attackPhase === 'idle' &&
      this.attackCooldown <= 0 &&
      !this.isDashing &&
      s.attackPressed
    ) {
      this.attackPhase = 'windup';
      this.attackTimer = ATTACK_WINDUP;
      this.attackCooldown = ATTACK_COOLDOWN;
    }

    if (this.attackPhase === 'idle') return;

    this.attackTimer -= dt;

    if (this.attackTimer > 0) return;

    // Transisi fase.
    if (this.attackPhase === 'windup') {
      this.attackPhase = 'active';
      this.attackTimer = ATTACK_ACTIVE;
      this.spawnAttackHitbox();
    } else if (this.attackPhase === 'active') {
      this.attackPhase = 'recover';
      this.attackTimer = ATTACK_RECOVER;
    } else {
      this.attackPhase = 'idle';
      this.attackTimer = 0;
    }
  }

  /**
   * Buat hitbox di depan player.
   * Posisi hitbox = player + (facing * ATTACK_RANGE).
   */
  private spawnAttackHitbox(): void {
    const hx = this.x + this.facingX * ATTACK_RANGE;
    const hy = this.y + this.facingY * ATTACK_RANGE;

    const damage = {
      amount: ATTACK_DAMAGE,
      element: 'physical' as const,
      source: this,
      sourceFaction: 'player' as const,
      knockbackForce: ATTACK_KNOCKBACK,
      hitstopMs: ATTACK_HITSTOP,
      critical: false,
    };

    this.combat.spawnCircle({
      x: hx,
      y: hy,
      radius: ATTACK_RADIUS,
      damage,
      lifespanMs: ATTACK_ACTIVE * 1000,
      owner: this,
      singleHitPerTarget: true,
    });
  }

  // ============================================================
  // STOP DUST
  // ============================================================

  private checkStopEvent(body: Phaser.Physics.Arcade.Body): void {
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
  }

  // ============================================================
  // VISUAL
  // ============================================================

  private postUpdate(): void {
    this.shadow.setPosition(this.x, this.y + 10);

    // Rotasi hanya saat tidak menyerang — saat menyerang kita ingin
    // sprite mengarah ke target dengan "pose" (nanti diganti animasi).
    if (!this.isAttacking) {
      this.setRotation(Math.atan2(this.facingY, this.facingX));
    }
  }

  protected onDeath(): void {
    super.onDeath();
  }
}