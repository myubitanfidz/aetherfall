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
  DAMAGE_NUMBER: 50,
  UI: 100,
} as const;

export const EVENTS = {
  // Combat
  ENTITY_DAMAGED: 'entity:damaged',
  ENTITY_DIED: 'entity:died',

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

  // Element colors (dipakai damage number nanti)
  ELEM_PHYSICAL: 0xffffff,
  ELEM_FIRE: 0xff7a3d,
  ELEM_ICE: 0x7ad4ff,
  ELEM_LIGHTNING: 0xffe45c,
} as const;

/** Warna damage number per elemen, dalam hex string untuk text. */
export const ELEMENT_COLORS: Record<string, string> = {
  physical: '#ffffff',
  fire: '#ff7a3d',
  ice: '#7ad4ff',
  lightning: '#ffe45c',
};