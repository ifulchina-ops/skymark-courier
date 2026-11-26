// Skymark Courier — keyboard and mouse input.
// Arrows / WASD steer and climb/dive, Shift throttles up, Ctrl/S throttles down,
// Space or click confirms, P pauses, M mutes. Mouse: hold and drag to steer.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

export function createInput(canvas) {
  let steer = 0; // -1 left .. 1 right
  let climb = 0; // -1 dive .. 1 climb
  let throttleUp = false;
  let throttleDown = false;
  let actions = 0;
  let mouseDown = false;
  let mouseX = 0;
  let mouseY = 0;
  const keys = new Set();

  function recompute() {
    const left = keys.has('ArrowLeft') || keys.has('a') || keys.has('A');
    const right = keys.has('ArrowRight') || keys.has('d') || keys.has('D');
    const up = keys.has('ArrowUp') || keys.has('w') || keys.has('W');
    const down = keys.has('ArrowDown') || keys.has('s') || keys.has('S');
    let s = (right ? 1 : 0) - (left ? 1 : 0);
    let c = (up ? 1 : 0) - (down ? 1 : 0);
    if (mouseDown) {
      const rect = canvas.getBoundingClientRect();
      const nx = (mouseX - rect.left) / rect.width - 0.5;
      const ny = (mouseY - rect.top) / rect.height - 0.5;
      s = Math.max(-1, Math.min(1, nx * 3));
      c = Math.max(-1, Math.min(1, -ny * 3));
    }
    steer = s;
    climb = c;
    throttleUp = keys.has('Shift');
    throttleDown = keys.has('Control') || keys.has('x') || keys.has('X');
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.key);
    if (event.key === ' ' || event.key === 'Enter') actions |= ACTION_CONFIRM;
    if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') actions |= ACTION_PAUSE;
    if (event.key === 'm' || event.key === 'M') actions |= ACTION_MUTE;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) event.preventDefault();
    recompute();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.key);
    recompute();
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
    actions |= ACTION_CONFIRM;
    recompute();
  });
  window.addEventListener('pointermove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    recompute();
  });
  window.addEventListener('pointerup', () => {
    mouseDown = false;
    recompute();
  });
  window.addEventListener('blur', () => {
    keys.clear();
    mouseDown = false;
    recompute();
  });

  return {
    direction() {
      return steer;
    },
    climbAmount() {
      return climb;
    },
    throttle() {
      if (throttleUp) return 1;
      if (throttleDown) return -1;
      return 0;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
