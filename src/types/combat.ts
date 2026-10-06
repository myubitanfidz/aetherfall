/**
 * Tipe-tipe yang dipakai di seluruh sistem combat.
 * Kita pisah ke file sendiri supaya tidak ada circular import
 * antara Entity, Hitbox, dan CombatSystem.
 */

export type ElementType = 'physical' | 'fire' | 'ice' | 'lightning';

export type Faction = 'player' | 'enemy' | 'neutral';

/**
 * Semua informasi yang dibawa oleh satu kali damage.
 * Dibuat oleh serangan, dibawa oleh Hitbox, diterima oleh Entity.takeDamage.
 */
export interface DamageInfo {
  /** Jumlah damage mentah sebelum dikurangi defense. */
  amount: number;

  /** Elemen damage. Default 'physical'. */
  element: ElementType;

  /** Sumber damage. Bisa null untuk trap/lingkungan. */
  source: unknown | null;

  /** Faksi sumber. Dipakai Hitbox untuk cek siapa yang boleh dipukul. */
  sourceFaction: Faction;

  /** Gaya knockback (px/s). 0 = tidak ada knockback. */
  knockbackForce: number;

  /** Berapa lama hitstop (ms) saat damage ini masuk. 0 = tidak ada. */
  hitstopMs: number;

  /** Apakah ini critical hit. */
  critical: boolean;
}

/**
 * Opsi untuk spawn hitbox lingkaran.
 */
export interface CircleHitboxOptions {
  x: number;
  y: number;
  radius: number;

  damage: DamageInfo;

  /** Berapa lama hitbox hidup (ms). Setelah itu dihapus. */
  lifespanMs: number;

  /** Satu target hanya bisa terkena 1 kali. Default true. */
  singleHitPerTarget?: boolean;

  /** Referensi ke entity pemilik, supaya tidak menabrak diri sendiri. */
  owner: unknown;
}