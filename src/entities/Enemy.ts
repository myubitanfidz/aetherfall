import Phaser from 'phaser';
import { Entity } from './Entity';
import type { CombatSystem } from '@/systems/CombatSystem';
import type { Player } from './Player';
import { DEPTHS } from '@/config/constants';
import { distance, normalize } from '@/utils/math';

export type AIState = 'idle' | 'chase' | 'windup' | 'attack' | 'recover';

/**
 * Base class untuk semua musuh.
 *
 * AI state machine sederhana:
 *   idle → chase → windup → attack → recover → chase
 *
 * Subclass hanya perlu:
 *   - Set tuning di constructor
 *   - Override performAttack() untuk spawn hitbox/projectile
 *
 * Semua state menggunakan timer (detik). Update dipanggil dari GameScene.
 */
export abstract class Enemy extends Entity {
  protected combat: CombatSystem;
  protected player: Player;

  protected aiState: AIState = 'idle';
  protected stateTimer = 0;

  // ---- Tuning. Override di subclass constructor. ----
  protected sightRange = 300;
  protected attackRange = 42;
  protected minAttackRange = 0;
  protected moveSpeed = 90;
  protected attackWindup = 0.32;
  protected attackActive = 0.08;
  protected attackRecover = 0.30;

  // ---- Health bar ----
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private readonly hpBarWidth = 30;
  private readonly hpBarHeight = 3;
  private readonly hpBarOffsetY = -22;

  // ---- Visual ----
  private shadow!: Phaser.GameObjects.Ellipse;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    maxHp: number,
    combat: CombatSystem,
    player: Player
  ) {
    super(scene, x, y, texture, maxHp, 'enemy');

    this.combat = combat;
    this.player = player;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 24);
    body.setOffset(4, 4);

    this.shadow = scene.add.ellipse(x, y + 10, 26, 12, 0x000000, 0.35);
    this.shadow.setDepth(DEPTHS.DECAL);

    this.createHealthBar(scene);

    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.shadow.destroy();
      this.hpBarBg.destroy();
      this.hpBarFill.destroy();
    });
  }

  private createHealthBar(scene: Phaser.Scene): void {
    this.hpBarBg = scene.add
      .rectangle(
        this.x,
        this.y + this.hpBarOffsetY,
        this.hpBarWidth + 2,
        this.hpBarHeight + 2,
        0x000000,
        0.7
      )
      .setDepth(DEPTHS.ENTITY + 1)
      .setVisible(false);

    this.hpBarFill = scene.add
      .rectangle(
        this.x - this.hpBarWidth / 2,
        this.y + this.hpBarOffsetY,
        this.hpBarWidth,
        this.hpBarHeight,
        0xff4d6d
      )
      .setOrigin(0, 0.5)
      .setDepth(DEPTHS.ENTITY + 2)
      .setVisible(false);
  }

  // ============================================================
  // MAIN LOOP
  // ============================================================

  updateEntity(delta: number): void {
    if (this.isDead) return;

    const dt = delta / 1000;
    const canAct = this.tickTimers(delta);

    if (canAct) {
      this.updateAI(dt);
    }

    this.updateVisuals();
  }

  private updateAI(dt: number): void {
    // Player mati → mundur ke idle.
    if (this.player.isDead) {
      if (this.aiState !== 'idle') {
        this.aiState = 'idle';
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.velocity.set(0, 0);
      }
      return;
    }

    const dist = distance(this.x, this.y, this.player.x, this.player.y);

    switch (this.aiState) {
      case 'idle':
        this.tickIdle(dist);
        break;
      case 'chase':
        this.tickChase(dist);
        break;
      case 'windup':
        this.tickWindup(dt);
        break;
      case 'attack':
        this.tickAttackPhase(dt);
        break;
      case 'recover':
        this.tickRecover(dt);
        break;
    }
  }

  // ============================================================
  // STATES
  // ============================================================

  private tickIdle(dist: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.velocity.x *= 0.9;
    body.velocity.y *= 0.9;

    if (dist < this.sightRange) {
      this.aiState = 'chase';
    }
  }

    private tickChase(dist: number): void {
    // Player kabur terlalu jauh → kembali idle.
    if (dist > this.sightRange * 1.5) {
      this.aiState = 'idle';
      return;
    }

    // Selalu hadap ke player.
    const n = normalize(this.player.x - this.x, this.player.y - this.y);
    this.setRotation(Math.atan2(n.y, n.x));

    // Dalam band serang?
    if (dist <= this.attackRange && dist >= this.minAttackRange) {
      this.enterWindup();
      return;
    }

    // Movement policy dari subclass.
    const v = this.getChaseVelocity(dist);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.velocity.x = v.x;
    body.velocity.y = v.y;
  }

  /**
   * Default: kejar player langsung.
   * Subclass (Shooter) override untuk kustomisasi.
   */
  protected getChaseVelocity(dist: number): { x: number; y: number } {
    void dist;
    const n = normalize(this.player.x - this.x, this.player.y - this.y);
    return { x: n.x * this.moveSpeed, y: n.y * this.moveSpeed };
  }

  private enterWindup(): void {
    this.aiState = 'windup';
    this.stateTimer = this.attackWindup;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.velocity.set(0, 0);

    // Telegraph: scale up sedikit.
    this.scene.tweens.add({
      targets: this,
      scale: 1.18,
      duration: this.attackWindup * 1000 * 0.85,
      ease: 'Quad.easeOut',
    });
  }

  private tickWindup(dt: number): void {
    this.stateTimer -= dt;
    if (this.stateTimer > 0) return;

    this.aiState = 'attack';
    this.stateTimer = this.attackActive;
    this.performAttack();
  }

  private tickAttackPhase(dt: number): void {
    this.stateTimer -= dt;
    if (this.stateTimer > 0) return;

    this.aiState = 'recover';
    this.stateTimer = this.attackRecover;

    // Reset scale.
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 150,
      ease: 'Quad.easeOut',
    });
  }

  private tickRecover(dt: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.velocity.x *= 0.85;
    body.velocity.y *= 0.85;

    this.stateTimer -= dt;
    if (this.stateTimer <= 0) {
      this.aiState = 'chase';
    }
  }

  // ============================================================
  // VISUAL
  // ============================================================

  private updateVisuals(): void {
    this.shadow.setPosition(this.x, this.y + 10);

    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    const showBar = ratio < 1;

    this.hpBarBg.setPosition(this.x, this.y + this.hpBarOffsetY);
    this.hpBarBg.setVisible(showBar);

    this.hpBarFill.setPosition(
      this.x - this.hpBarWidth / 2,
      this.y + this.hpBarOffsetY
    );
    this.hpBarFill.setVisible(showBar);
    this.hpBarFill.setScale(ratio, 1);
  }

  // ============================================================
  // SUBCLASS HOOK
  // ============================================================

  /**
   * Dipanggil sekali saat masuk fase 'attack'.
   * Subclass WAJIB implementasi — spawn hitbox atau projectile.
   */
  protected abstract performAttack(): void;

  protected onDeath(): void {
    // Sembunyikan health bar langsung.
    this.hpBarBg.destroy();
    this.hpBarFill.destroy();

    // Efek mati: mengecil + memudar.
    this.scene.tweens.add({
      targets: [this, this.shadow],
      alpha: 0,
      scale: 0.3,
      duration: 180,
      ease: 'Quad.easeIn',
      onComplete: () => super.onDeath(),
    });
  }
}