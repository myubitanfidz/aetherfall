import Phaser from 'phaser';
import { SCENE_KEYS, DEPTHS, COLORS, TILE_SIZE, EVENTS } from '@/config/constants';
import { SceneManager } from '@/core/SceneManager';
import { InputManager } from '@/core/InputManager';
import { EventBus } from '@/core/EventBus';
import { Player } from '@/entities/Player';
import { DummyEnemy } from '@/entities/DummyEnemy';
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
    this.player = new Player(this, centerX, centerY, this.inputManager, this.combat);
    this.combat.registerEntity(this.player);

    // ---- Dummy targets ----
    this.spawnDummy(centerX + 120, centerY - 40);
    this.spawnDummy(centerX + 160, centerY + 60);
    this.spawnDummy(centerX - 140, centerY + 40);

    // ---- Camera ----
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(140, 100);
    this.cameras.main.setZoom(1.5);

    // ---- Debug ----
    this.debug = new DebugSystem(this);

    // ---- HUD statis ----
    this.createHud();

    // ---- Event listeners ----
    this.setupCombatEvents();

    // ---- UIScene ----
    this.scene.launch(SCENE_KEYS.UI, { gameScene: this });

    // ---- Input & cleanup ----
    this.setupInput();
    this.setupCleanup();
  }

  // ============================================================
  // PUBLIC API (untuk UIScene)
  // ============================================================

  getPlayer(): Player {
    return this.player;
  }

  // ============================================================
  // SETUP
  // ============================================================

  private spawnDummy(x: number, y: number): void {
    const dummy = new DummyEnemy(this, x, y);
    this.combat.registerEntity(dummy);
    this.enemies.push(dummy);

    // Bersihkan dari list saat mati.
    dummy.once(Phaser.GameObjects.Events.DESTROY, () => {
      const idx = this.enemies.indexOf(dummy);
      if (idx >= 0) this.enemies.splice(idx, 1);
    });
  }

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
    // Setiap damage → spawn damage number + hitstop request.
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
      // Nanti: drop loot, tambah skor, dsb.
      // Untuk sekarang, cukup lewat.
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
      for (const e of this.enemies) {
        e.updateEntity(delta);
      }
    }

    // CombatSystem tetap update walaupun hitstop — supaya hitbox
    // yang aktif tetap konsisten dengan life-cycle-nya.
    // (Kalau mau hitbox juga freeze, ganti jadi di dalam if di atas.)
    this.combat.update(delta);

    this.effects.update(delta);
    this.debug.update(this.player);
  }
}