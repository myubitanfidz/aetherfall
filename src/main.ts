import Phaser from 'phaser';
import { gameConfig } from '@/config/gameConfig';
import { BootScene } from '@/scenes/BootScene';
import { PreloadScene } from '@/scenes/PreloadScene';
import { MainMenuScene } from '@/scenes/MainMenuScene';
import { GameScene } from '@/scenes/GameScene';
import { UIScene } from '@/scenes/UIScene';

/**
 * Titik masuk aplikasi.
 * Kita gabungkan gameConfig dari config/gameConfig.ts dengan daftar scene.
 *
 * Urutan scene penting: scene pertama di array = scene yang otomatis dijalankan.
 */
const config: Phaser.Types.Core.GameConfig = {
  ...gameConfig,
  scene: [BootScene, PreloadScene, MainMenuScene, GameScene, UIScene],
};

const game = new Phaser.Game(config);

/**
 * Hot Module Replacement (Vite): saat kita edit kode, browser tidak reload
 * penuh, cukup hancurkan game lama supaya tidak ada dua canvas.
 */
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
  });
}

// Expose ke window untuk debugging manual di console browser.
(window as unknown as { __GAME__: Phaser.Game }).__GAME__ = game;