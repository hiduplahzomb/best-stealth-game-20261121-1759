// Keyboard and mouse input. WASD or the arrow keys move, Shift sneaks,
// M mutes, R restarts the level, Enter or Space advances the screens, and a
// click on the floor walks the player there. Keys are tracked as a set so
// diagonal movement works; one-shot presses (start, restart, mute) are
// consumed by the game loop through pressed().
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressedKeys = new Set();
    this.click = null;
    this.canvas = canvas;
    this.onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) this.pressedKeys.add(e.key.toLowerCase());
      this.keys.add(e.key.toLowerCase());
    };
    this.onKeyUp = (e) => this.keys.delete(e.key.toLowerCase());
    this.onBlur = () => this.keys.clear();
    this.onMouseDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.click = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
      this.pressedKeys.add('click');
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    canvas.addEventListener('mousedown', this.onMouseDown);
  }

  // The move direction from the keys: each component -1, 0 or 1.
  moveVector() {
    const k = this.keys;
    const x = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    const y = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
    return { mx: x, my: y };
  }

  get sneaking() {
    return this.keys.has('shift');
  }

  // True once per physical press; the loop calls this after handling the key.
  pressed(key) {
    if (this.pressedKeys.has(key)) {
      this.pressedKeys.delete(key);
      return true;
    }
    return false;
  }

  // A click target in canvas pixels, or null. Cleared once the loop reads it.
  takeClick() {
    const c = this.click;
    this.click = null;
    return c;
  }

  clearClick() {
    this.click = null;
  }
}
