// Keyboard and mouse/touch input. One frame's worth of actions is collected and handed
// out once, so a key held down never fires twice and a click never double-starts a run.
//
// Keyboard: Space / ArrowUp / W jumps, ArrowDown / S slides while held, P pauses,
// Enter confirms. Mouse/touch: a quick tap jumps; pressing and holding slides until
// release; on the title and end screens a tap starts or restarts.

export const ACTION_JUMP = 1;
export const ACTION_SLIDE = 2;
export const ACTION_CONFIRM = 4;
export const ACTION_PAUSE = 8;

/** Milliseconds a pointer must be held before it counts as a slide instead of a jump. */
const HOLD_MS = 130;

export function createInput(canvas) {
  let actions = 0;
  let slideHeld = false;
  let pointerDownAt = 0;
  let pointerHeld = false;

  function keyDown(event) {
    if (event.repeat) return;
    if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
      actions |= ACTION_JUMP | ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
      slideHeld = true;
      actions |= ACTION_SLIDE;
      event.preventDefault();
    } else if (event.code === 'Enter') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyM') {
      actions |= 16; // ACTION_MUTE, handled by the caller.
    }
  }

  function keyUp(event) {
    if (event.code === 'ArrowDown' || event.code === 'KeyS') slideHeld = false;
  }

  function pointerDown(event) {
    event.preventDefault();
    pointerHeld = true;
    pointerDownAt = performance.now();
    // Hold to slide: if the pointer is still down after HOLD_MS, it becomes a slide.
    window.setTimeout(() => {
      if (pointerHeld && performance.now() - pointerDownAt >= HOLD_MS) {
        slideHeld = true;
        actions |= ACTION_SLIDE;
      }
    }, HOLD_MS);
  }

  function pointerUp(event) {
    event.preventDefault();
    const heldMs = performance.now() - pointerDownAt;
    pointerHeld = false;
    if (slideHeld) {
      slideHeld = false;
    } else if (heldMs < HOLD_MS) {
      actions |= ACTION_JUMP | ACTION_CONFIRM;
    }
  }

  function pointerLeave() {
    pointerHeld = false;
    slideHeld = false;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerLeave);
  canvas.addEventListener('pointerleave', pointerLeave);

  return {
    /** The actions pressed since the last call, then cleared. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Whether slide is currently held (keyboard or pointer). */
    slideDown() {
      return slideHeld;
    },
  };
}
