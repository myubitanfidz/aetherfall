export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const TILE_SIZE = 32;

export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  MAIN_MENU: 'MainMenuScene',
  GAME: 'GameScene',
  UI: 'UIScene',
} as const;

export const DEPTHS = {
  GROUND: 0,
  DECAL: 10,
  ENTITY: 20,
  PROJECTILE: 30,
  FX: 40,
  UI: 100,
} as const;

export const EVENTS = {
  // Combat & gameplay
  PLAYER_DAMAGED: 'player:damaged',
  ENEMY_KILLED: 'enemy:killed',
  LOOT_DROPPED: 'loot:dropped',
  SCENE_CHANGED: 'scene:changed',

  // Player movement (dipakai EffectsSystem)
  PLAYER_DASH_STARTED: 'player:dash-started',
  PLAYER_DASH_TICK: 'player:dash-tick',
  PLAYER_STOPPED: 'player:stopped',

  // Sistem global
  HITSTOP_REQUEST: 'hitstop:request',
} as const;

export const COLORS = {
  BG: 0x0a0a12,
  PRIMARY: 0x6ee7ff,
  DANGER: 0xff4d6d,
  GOLD: 0xffd166,
  SUCCESS: 0x4ade80,
  PANEL_BG: 0x1a1a2e,
  PANEL_BORDER: 0x252540,
  MUTED: 0x505068,
} as const;