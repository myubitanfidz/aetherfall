import Phaser from 'phaser';
import { SCENE_KEYS, DEPTHS, COLORS, TILE_SIZE } from '@/config/constants';
import { SceneManager } from '@/core/SceneManager';
import { InputManager } from '@/core/InputManager';
import { Player } from '@/entities/Player';
import { DebugSystem } from '@/systems/DebugSystem';
import { EffectsSystem } from '@/systems/EffectsSystem';
import { HitStopSystem } from '@/systems/HitStopSystem';

export class GameScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private player!: Player;
  private debug!: DebugSystem;
  private effects!: EffectsSystem;
  private hitstop!: HitStopSystem;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG);

    this.createGrid();
    this.createWorldBounds();

    // Urutan penting:
    // 1. EffectsSystem — siap mendengarkan event sebelum Player emit.
    // 2. InputManager — Player butuh ini.
    // 3. HitStopSystem — siap menerima request dari mana saja.
    this.effects = new EffectsSystem(this);
    this.hitstop = new HitStopSystem();
    this.inputManager = new InputManager(this);

    const { centerX, centerY } = this.cameras.main;
    this.player = new Player(this, centerX, centerY, this.inputManager);

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(140, 100);
    this.cameras.main.setZoom(1.5);

    this.debug = new DebugSystem(this);

    this.createHud();

    // Luncurkan UIScene dengan reference ke scene ini.
    this.scene.launch(SCENE_KEYS.UI, { gameScene: this });

    this.setupInput();
    this.setupCleanup();
  }

  /**
   * Getter publik supaya UIScene bisa baca state player.
   */
  getPlayer(): Player {
    return this.player;
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
    // HUD statis di scene (bukan UIScene) — teks kontrol.
    this.add
      .text(
        16,
        100,
        [
          'WASD/Arrow : gerak',
          'Shift      : sprint',
          'Ctrl / RMB : dash',
          'F1         : debug',
          'ESC        : menu',
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

  private setupInput(): void {
    this.input.keyboard?.on('keydown-ESC', () => {
      SceneManager.goToMainMenu(this);
    });
  }

  private setupCleanup(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputManager.destroy();
      this.debug.destroy();
      this.effects.destroy();
      this.hitstop.destroy();

      if (this.scene.isActive(SCENE_KEYS.UI)) {
        this.scene.stop(SCENE_KEYS.UI);
      }
    });
  }

  update(_time: number, delta: number): void {
    // Input selalu di-update, bahkan saat hitstop, supaya buffer input
    // tetap responsif saat freeze selesai.
    this.inputManager.update();

    this.hitstop.update(delta);

    // Saat hitstop aktif, entity tidak update. Efek visual tetap jalan
    // supaya tidak terasa "rusak".
    if (!this.hitstop.isFrozen && !this.player.isDead) {
      this.player.updateEntity(delta);
    }

    this.effects.update(delta);
    this.debug.update(this.player);
  }
}