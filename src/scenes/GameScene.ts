import Phaser from 'phaser';
import {
  SCENE_KEYS,
  DEPTHS,
  COLORS,
  TILE_SIZE,
  EVENTS,
} from '@/config/constants';
import { SceneManager } from '@/core/SceneManager';
import { InputManager } from '@/core/InputManager';
import { EventBus } from '@/core/EventBus';
import { Player } from '@/entities/Player';
import { Grunt } from '@/entities/enemies/Grunt';
import { Shooter } from '@/entities/enemies/Shooter';
import { DebugSystem } from '@/systems/DebugSystem';
import { EffectsSystem } from '@/systems/EffectsSystem';
import { HitStopSystem } from '@/systems/HitStopSystem';
import { CombatSystem } from '@/systems/CombatSystem';
import { DamageNumberSystem } from '@/systems/DamageNumberSystem';
import type { Entity } from '@/entities/Entity';
import type { DamageInfo } from '@/types/combat';

export class GameScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private combat!: CombatSystem;
  private effects!: EffectsSystem;
  private hitstop!: HitStopSystem;
  private damageNumbers!: DamageNumberSystem;
  private debug!: DebugSystem;

  private player!: Player;
  private enemies: Entity[] = [];

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG);

    this.createGrid();
    this.createWorldBounds();

    // ---- Systems ----
    this.effects = new EffectsSystem(this);
    this.hitstop = new HitStopSystem();
    this.damageNumbers = new DamageNumberSystem(this);
    this.combat = new CombatSystem(this);
    this.inputManager = new InputManager(this);

    // ---- Player ----
    const { centerX, centerY } = this.cameras.main;
    this.player = new Player(
      this,
      centerX,
      centerY,
      this.inputManager,
      this.combat
    );
    this.combat.registerEntity(this.player);

        // ---- Musuh ----
    this.spawnGrunt(centerX + 240, centerY - 80);
    this.spawnGrunt(centerX - 200, centerY + 60);
    this.spawnShooter(centerX + 360, centerY + 140);
    this.spawnShooter(centerX - 340, centerY - 120);

    // ---- Camera ----
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(140, 100);
    this.cameras.main.setZoom(1.5);

    // ---- Debug ----
    this.debug = new DebugSystem(this);

    // ---- HUD ----
    this.createHud();

    // ---- Events ----
    this.setupCombatEvents();

    // ---- UIScene ----
    this.scene.launch(SCENE_KEYS.UI, { gameScene: this });

    // ---- Input & cleanup ----
    this.setupInput();
    this.setupCleanup();
  }

  getPlayer(): Player {
    return this.player;
  }

  // ============================================================
  // SPAWN
  // ============================================================

  private spawnGrunt(x: number, y: number): void {
    const grunt = new Grunt(this, x, y, this.combat, this.player);
    this.trackEnemy(grunt);
  }

    private spawnShooter(x: number, y: number): void {
    const shooter = new Shooter(this, x, y, this.combat, this.player);
    this.trackEnemy(shooter);
  }

  private trackEnemy(enemy: Entity): void {
    this.combat.registerEntity(enemy);
    this.enemies.push(enemy);

    enemy.once(Phaser.GameObjects.Events.DESTROY, () => {
      const idx = this.enemies.indexOf(enemy);
      if (idx >= 0) this.enemies.splice(idx, 1);
    });
  }

  // ============================================================
  // SETUP
  // ============================================================

  private createGrid(): void {
    const g = this.add.graphics();
    g.lineStyle(1, 0x1a1a2e, 1);
    g.setDepth(DEPTHS.GROUND);

    const WORLD = 2000;
    for (let x = -WORLD; x <= WORLD; x += TILE_SIZE * 2) {
      g.lineBetween(x, -WORLD, x, WORLD);
    }
    for (let y = -WORLD; y <= WORLD; y += TILE_SIZE * 2) {
      g.lineBetween(-WORLD, y, WORLD, y);
    }
  }

  private createWorldBounds(): void {
    this.physics.world.setBounds(-1000, -1000, 2000, 2000);
  }

  private createHud(): void {
    this.add
      .text(
        16,
        100,
        [
          'WASD / Arrow : gerak',
          'Shift        : sprint',
          'Ctrl / RMB   : dash',
          'LMB / Space  : serang',
          'F1           : debug',
          'F2           : debug hitbox',
          'ESC          : menu',
        ].join('\n'),
        {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#505068',
          lineSpacing: 3,
        }
      )
      .setScrollFactor(0)
      .setDepth(DEPTHS.UI);
  }

  private setupCombatEvents(): void {
    EventBus.on(
      EVENTS.ENTITY_DAMAGED,
      (payload: { entity: Entity; amount: number; info: DamageInfo }) => {
        this.damageNumbers.spawn(
          payload.entity.x,
          payload.entity.y - 20,
          payload.amount,
          payload.info.element,
          payload.info.critical
        );

        if (payload.info.hitstopMs > 0) {
          EventBus.emit(EVENTS.HITSTOP_REQUEST, payload.info.hitstopMs);
        }
      }
    );

    EventBus.on(EVENTS.ENTITY_DIED, (payload: { entity: Entity }) => {
      void payload;
    });
  }

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (!kb) return;

    kb.on('keydown-ESC', () => {
      SceneManager.goToMainMenu(this);
    });

    kb.on('keydown-F2', (e: KeyboardEvent) => {
      e.preventDefault();
      this.combat.setDebugDraw(!this.combat.debugDraw);
    });
  }

  private setupCleanup(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputManager.destroy();
      this.debug.destroy();
      this.effects.destroy();
      this.hitstop.destroy();
      this.damageNumbers.destroy();
      this.combat.destroy();

      EventBus.off(EVENTS.ENTITY_DAMAGED);
      EventBus.off(EVENTS.ENTITY_DIED);

      if (this.scene.isActive(SCENE_KEYS.UI)) {
        this.scene.stop(SCENE_KEYS.UI);
      }
    });
  }

  // ============================================================
  // UPDATE
  // ============================================================

  update(_time: number, delta: number): void {
    this.inputManager.update();
    this.hitstop.update(delta);

    if (!this.hitstop.isFrozen && !this.player.isDead) {
      this.player.updateEntity(delta);
    }

    if (!this.hitstop.isFrozen) {
      for (const e of this.enemies) {
        e.updateEntity(delta);
      }
    }

    this.combat.update(delta);
    this.effects.update(delta);
    this.debug.update(this.player);
  }
}