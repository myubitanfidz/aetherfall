import Phaser from 'phaser';
import { SCENE_KEYS, DEPTHS, COLORS, TILE_SIZE } from '@/config/constants';
import { SceneManager } from '@/core/SceneManager';
import { InputManager } from '@/core/InputManager';
import { Player } from '@/entities/Player';
import { DebugSystem } from '@/systems/DebugSystem';

export class GameScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private player!: Player;
  private debug!: DebugSystem;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG);

    this.createGrid();
    this.createWorldBounds();

    this.inputManager = new InputManager(this);

    const { centerX, centerY } = this.cameras.main;
    this.player = new Player(this, centerX, centerY, this.inputManager);

    // Kamera mengikuti player.
    // - lerp 0.08: sedikit lag supaya terasa natural
    // - deadzone 140x100: player boleh bergerak sedikit tanpa kamera ikut
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(140, 100);
    this.cameras.main.setZoom(1.5);

    this.debug = new DebugSystem(this);

    this.createHud();
    this.setupInput();
    this.setupCleanup();
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
        16,
        [
          'GameScene — Tahap 1C-2',
          'WASD / Arrow : gerak',
          'Shift        : sprint',
          'Ctrl / RMB   : dash',
          'F1           : debug',
          'ESC          : menu',
        ].join('\n'),
        {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#6ee7ff',
          lineSpacing: 4,
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
      if (this.scene.isActive(SCENE_KEYS.UI)) {
        this.scene.stop(SCENE_KEYS.UI);
      }
    });
  }

  update(_time: number, delta: number): void {
    this.inputManager.update();

    if (!this.player.isDead) {
      this.player.updateEntity(delta);
    }

    this.debug.update(this.player);
  }
}