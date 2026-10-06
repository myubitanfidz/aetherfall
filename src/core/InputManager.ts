import Phaser from 'phaser';

export interface InputState {
  moveX: number;
  moveY: number;

  aimWorldX: number;
  aimWorldY: number;
  aimX: number;
  aimY: number;

  // Edge-triggered: true hanya di frame tombol ditekan.
  attackPressed: boolean;
  dashPressed: boolean;

  // Held: true selama tombol ditahan.
  attackHeld: boolean;
  dashHeld: boolean;
  sprintHeld: boolean;
}

export class InputManager {
  private scene: Phaser.Scene;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

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
    sprintHeld: false,
  };

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
        dash: Phaser.Input.Keyboard.KeyCodes.CTRL,
        sprint: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      }
    ) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  private setupMouse(): void {
    // Cegah menu context browser muncul saat klik kanan.
    this.scene.input.mouse?.disableContextMenu();
  }

  update(): void {
    const s = this.state;
    const pointer = this.scene.input.activePointer;

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

    const len = Math.sqrt(mx * mx + my * my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    s.moveX = mx;
    s.moveY = my;

    // ---- Aim (selalu update tiap frame) ----
    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    s.aimWorldX = world.x;
    s.aimWorldY = world.y;

    // ---- Actions ----
    const attackDown = this.keys?.attack.isDown === true || pointer.leftButtonDown();
    const dashDown = this.keys?.dash.isDown === true || pointer.rightButtonDown();
    const sprintDown = this.keys?.sprint.isDown === true;

    s.attackHeld = attackDown;
    s.dashHeld = dashDown;
    s.sprintHeld = sprintDown;

    s.attackPressed = attackDown && !this.attackWasDown;
    s.dashPressed = dashDown && !this.dashWasDown;

    this.attackWasDown = attackDown;
    this.dashWasDown = dashDown;
  }

  destroy(): void {
    this.scene.input.removeAllListeners();
  }
}