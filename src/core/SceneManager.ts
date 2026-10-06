import Phaser from 'phaser';
import { SCENE_KEYS } from '@/config/constants';

/**
 * Helper untuk transisi antar scene.
 * Semua method static karena tidak butuh state.
 */
export class SceneManager {
  /**
   * Mulai gameplay. UIScene akan di-launch paralel oleh GameScene itu sendiri.
   */
  static startGame(from: Phaser.Scene): void {
    from.scene.start(SCENE_KEYS.GAME);
  }

  /**
   * Kembali ke menu utama dan pastikan UIScene dimatikan.
   */
  static goToMainMenu(from: Phaser.Scene): void {
    if (from.scene.isActive(SCENE_KEYS.UI)) {
      from.scene.stop(SCENE_KEYS.UI);
    }
    from.scene.start(SCENE_KEYS.MAIN_MENU);
  }

  /**
   * Pause gameplay tanpa mematikannya (untuk menu pause).
   */
  static pauseGame(from: Phaser.Scene): void {
    if (from.scene.isActive(SCENE_KEYS.GAME)) {
      from.scene.pause(SCENE_KEYS.GAME);
    }
  }

  /**
   * Lanjutkan gameplay dari pause.
   */
  static resumeGame(from: Phaser.Scene): void {
    if (from.scene.isPaused(SCENE_KEYS.GAME)) {
      from.scene.resume(SCENE_KEYS.GAME);
    }
  }

  /**
   * Restart gameplay dari awal (untuk kasus mati lalu coba lagi).
   */
  static restartGame(from: Phaser.Scene): void {
    from.scene.stop(SCENE_KEYS.UI);
    from.scene.stop(SCENE_KEYS.GAME);
    from.scene.start(SCENE_KEYS.GAME);
  }
}