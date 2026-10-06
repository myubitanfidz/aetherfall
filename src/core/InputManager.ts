import Phaser from 'phaser';

/**
 * State input yang dibaca oleh gameplay tiap frame.
 * Semua sistem lain hanya butuh interface ini, bukan detail device.
 */
export interface InputState {
  // Arah gerak, sudah dinormalisasi. Panjang 0..1.
  moveX: number;
  moveY: number;

  // Posisi aim di world coordinate (hasil dari mouse/touch kanan).
  aimWorldX: number;
  aimWorldY: number;

  // Arah aim sebagai vektor satuan.
  aimX: number;
  aimY: number;

  // Action edge-triggered (true hanya di frame saat tombol ditekan).
  attackPressed: boolean;
  dashPressed: boolean;

  // Action held (true selama tombol ditahan).
  attackHeld: boolean;
  dashHeld: boolean;
}

/**
 * InputManager mengelola semua device input dan mengekspos state
 * yang seragam. Nanti mobile tinggal menambahkan virtual joystick
 * tanpa mengubah Player.
 */
export class InputManager {
  private scene: Phaser.Scene;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  // State yang dipublikasikan.
  public state: InputState = {
    moveX: 0,
    moveY: 0,
    aimWorldX: 0,
    aimWorldY: 0,
    aimX: 1,
    aimY: 0,
    attackPressed: false,
    dashPressed: false,
    attackHeld: false,
    dashHeld: false,
  };

  // Flag internal untuk edge detection.
  private attackWasDown = false;
  private dashWasDown = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupKeyboard();
    this.setupMouse();
  }

  private setupKeyboard(): void {
    const kb = this.scene.input.keyboard;
    if (!kb) return;

    this.keys = kb.addKeys(
      {
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        upArrow: Phaser.Input.Keyboard.KeyCodes.UP,
        downArrow: Phaser.Input.Keyboard.KeyCodes.DOWN,
        leftArrow: Phaser.Input.Keyboard.KeyCodes.LEFT,
        rightArrow: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        attack: Phaser.Input.Keyboard.KeyCodes.SPACE,
        dash: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      }
    ) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  private setupMouse(): void {
    // Update aim tiap gerakan mouse.
    this.scene.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      this.state.aimWorldX = pointer.worldX;
      this.state.aimWorldY = pointer.worldY;
    });

    // Klik kiri = attack.
    this.scene.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.attackWasDown = true;
      }
      if (pointer.rightButtonDown()) {
        this.dashWasDown = true;
      }
    });
  }

  /**
   * Dipanggil setiap frame oleh GameScene sebelum update entity.
   */
  update(): void {
    const s = this.state;

    // ---- Movement (8 arah) ----
    let mx = 0;
    let my = 0;

    if (this.keys) {
      const left = this.keys.left.isDown || this.keys.leftArrow.isDown;
      const right = this.keys.right.isDown || this.keys.rightArrow.isDown;
      const up = this.keys.up.isDown || this.keys.upArrow.isDown;
      const down = this.keys.down.isDown || this.keys.downArrow.isDown;

      if (left) mx -= 1;
      if (right) mx += 1;
      if (up) my -= 1;
      if (down) my += 1;
    }

    // Normalisasi supaya diagonal tidak lebih cepat.
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    s.moveX = mx;
    s.moveY = my;

    // ---- Aim direction ----
    const player = this.scene.cameras.main.getWorldPoint(
      this.scene.input.activePointer.x,
      this.scene.input.activePointer.y
    );
    s.aimWorldX = player.x;
    s.aimWorldY = player.y;

    // ---- Action held ----
    const attackDown =
      this.keys?.attack.isDown === true || this.scene.input.activePointer.leftButtonDown();
    const dashDown =
      this.keys?.dash.isDown === true || this.scene.input.activePointer.rightButtonDown();

    s.attackHeld = attackDown;
    s.dashHeld = dashDown;

    // ---- Edge detection ----
    s.attackPressed = attackDown && !this.attackWasDown;
    s.dashPressed = dashDown && !this.dashWasDown;

    this.attackWasDown = attackDown;
    this.dashWasDown = dashDown;
  }

  /**
   * Set arah aim dari vektor (dipakai mobile/touch atau AI nanti).
   * Sengaja terpisah supaya gameplay tidak peduli sumbernya.
   */
  setAimVector(x: number, y: number): void {
    const len = Math.sqrt(x * x + y * y);
    if (len < 1e-6) return;
    this.state.aimX = x / len;
    this.state.aimY = y / len;
  }

  destroy(): void {
    this.scene.input.removeAllListeners();
  }
}