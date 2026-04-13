export type TouchGesture = "tap" | "double-tap" | "swipe-left" | "swipe-right" | "swipe-down";

export type TouchCommands = {
  readonly tap: () => void;
  readonly doubleTap: () => void;
  readonly swipeLeft: () => void;
  readonly swipeRight: () => void;
  readonly swipeDown: () => void;
};

type TouchState = {
  startX: number;
  startY: number;
  startTime: number;
  lastTapAt: number | null;
};

const SWIPE_DISTANCE = 32;
const TAP_MAX_DISTANCE = 12;
const TAP_MAX_DURATION_MS = 220;
const DOUBLE_TAP_WINDOW_MS = 260;

export function attachTouchControls(input: {
  readonly element: HTMLElement;
  readonly commands: TouchCommands;
}) {
  const state: TouchState = {
    startX: 0,
    startY: 0,
    startTime: 0,
    lastTapAt: null,
  };

  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    state.startX = touch.clientX;
    state.startY = touch.clientY;
    state.startTime = performance.now();
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (event.changedTouches.length !== 1) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;
    const elapsedMs = performance.now() - state.startTime;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX <= TAP_MAX_DISTANCE && absY <= TAP_MAX_DISTANCE && elapsedMs <= TAP_MAX_DURATION_MS) {
      const now = performance.now();

      if (state.lastTapAt !== null && now - state.lastTapAt <= DOUBLE_TAP_WINDOW_MS) {
        state.lastTapAt = null;
        input.commands.doubleTap();
      } else {
        state.lastTapAt = now;
        input.commands.tap();
      }
      return;
    }

    if (absX >= SWIPE_DISTANCE && absX > absY) {
      if (deltaX < 0) {
        input.commands.swipeLeft();
      } else {
        input.commands.swipeRight();
      }
      return;
    }

    if (deltaY >= SWIPE_DISTANCE && absY > absX) {
      input.commands.swipeDown();
    }
  };

  input.element.addEventListener("touchstart", onTouchStart, { passive: true });
  input.element.addEventListener("touchend", onTouchEnd, { passive: true });

  return () => {
    input.element.removeEventListener("touchstart", onTouchStart);
    input.element.removeEventListener("touchend", onTouchEnd);
  };
}
