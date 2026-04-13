export type KeyboardBindings = {
  readonly moveLeft: readonly string[];
  readonly moveRight: readonly string[];
  readonly softDrop: readonly string[];
  readonly hardDrop: readonly string[];
  readonly hold: readonly string[];
  readonly rotateCw: readonly string[];
  readonly rotateCcw: readonly string[];
};

export type KeyboardTiming = {
  readonly dasMs: number;
  readonly arrMs: number;
};

export type KeyboardCommands = {
  readonly moveLeft: () => void;
  readonly moveRight: () => void;
  readonly softDrop: () => void;
  readonly hardDrop: () => void;
  readonly hold: () => void;
  readonly rotateClockwise: () => void;
  readonly rotateCounterClockwise: () => void;
  readonly togglePause: () => void;
};

type PressState = {
  pressed: boolean;
  pressedAt: number;
  lastRepeatAt: number | null;
};

type DirectionState = "left" | "right" | null;

export type KeyboardController = {
  readonly handleKeyDown: (event: KeyboardEvent) => void;
  readonly handleKeyUp: (event: KeyboardEvent) => void;
  readonly update: (timestamp: number) => void;
};

export const DEFAULT_KEYBOARD_BINDINGS: KeyboardBindings = {
  moveLeft: ["ArrowLeft", "KeyA"],
  moveRight: ["ArrowRight", "KeyD"],
  softDrop: ["ArrowDown", "KeyS"],
  hardDrop: ["Space"],
  hold: ["KeyC"],
  rotateCw: ["ArrowUp", "KeyX"],
  rotateCcw: ["KeyZ"],
};

function createIdlePressState(): PressState {
  return {
    pressed: false,
    pressedAt: 0,
    lastRepeatAt: null,
  };
}

export function isInputCode(binding: readonly string[], code: string): boolean {
  return binding.includes(code);
}

export function createKeyboardController(input: {
  readonly bindings: KeyboardBindings;
  readonly timing: KeyboardTiming;
  readonly commands: KeyboardCommands;
  readonly shouldIgnoreKeyboardEvent: (event: KeyboardEvent) => boolean;
}): KeyboardController {
  const leftState = createIdlePressState();
  const rightState = createIdlePressState();
  const softDropState = createIdlePressState();

  const getActiveDirection = (): DirectionState => {
    if (leftState.pressed && rightState.pressed) {
      return leftState.pressedAt >= rightState.pressedAt ? "left" : "right";
    }

    if (leftState.pressed) {
      return "left";
    }

    if (rightState.pressed) {
      return "right";
    }

    return null;
  };

  const triggerDirection = (direction: DirectionState) => {
    if (direction === "left") {
      input.commands.moveLeft();
    }

    if (direction === "right") {
      input.commands.moveRight();
    }
  };

  const pressDirection = (state: PressState, direction: DirectionState, timestamp: number) => {
    if (!state.pressed) {
      state.pressed = true;
      state.pressedAt = timestamp;
      state.lastRepeatAt = null;
      triggerDirection(direction);
      return;
    }

    state.pressedAt = timestamp;
  };

  const releaseDirection = (state: PressState) => {
    state.pressed = false;
    state.lastRepeatAt = null;
  };

  return {
    handleKeyDown: (event: KeyboardEvent) => {
      if (input.shouldIgnoreKeyboardEvent(event)) {
        return;
      }

      const timestamp = performance.now();

      if (isInputCode(input.bindings.moveLeft, event.code)) {
        event.preventDefault();
        pressDirection(leftState, "left", timestamp);
        return;
      }

      if (isInputCode(input.bindings.moveRight, event.code)) {
        event.preventDefault();
        pressDirection(rightState, "right", timestamp);
        return;
      }

      if (isInputCode(input.bindings.softDrop, event.code)) {
        event.preventDefault();

        if (!softDropState.pressed) {
          softDropState.pressed = true;
          softDropState.pressedAt = timestamp;
          softDropState.lastRepeatAt = timestamp;
          input.commands.softDrop();
        }
        return;
      }

      if (event.repeat) {
        return;
      }

      if (isInputCode(input.bindings.hardDrop, event.code)) {
        event.preventDefault();
        input.commands.hardDrop();
        return;
      }

      if (isInputCode(input.bindings.rotateCw, event.code)) {
        event.preventDefault();
        input.commands.rotateClockwise();
        return;
      }

      if (isInputCode(input.bindings.rotateCcw, event.code)) {
        event.preventDefault();
        input.commands.rotateCounterClockwise();
        return;
      }

      if (isInputCode(input.bindings.hold, event.code)) {
        event.preventDefault();
        input.commands.hold();
        return;
      }

      if (event.code === "Escape" || event.code === "KeyP") {
        event.preventDefault();
        input.commands.togglePause();
      }
    },
    handleKeyUp: (event: KeyboardEvent) => {
      if (isInputCode(input.bindings.moveLeft, event.code)) {
        releaseDirection(leftState);
        return;
      }

      if (isInputCode(input.bindings.moveRight, event.code)) {
        releaseDirection(rightState);
        return;
      }

      if (isInputCode(input.bindings.softDrop, event.code)) {
        softDropState.pressed = false;
        softDropState.lastRepeatAt = null;
      }
    },
    update: (timestamp: number) => {
      const activeDirection = getActiveDirection();
      const activeState =
        activeDirection === "left"
          ? leftState
          : activeDirection === "right"
            ? rightState
            : null;

      if (activeDirection !== null && activeState !== null) {
        const hasReachedDas = timestamp - activeState.pressedAt >= input.timing.dasMs;

        if (hasReachedDas) {
          const lastRepeatAt =
            activeState.lastRepeatAt ?? activeState.pressedAt + input.timing.dasMs;

          if (timestamp - lastRepeatAt >= input.timing.arrMs) {
            triggerDirection(activeDirection);
            activeState.lastRepeatAt = timestamp;
          }
        }
      }

      if (softDropState.pressed) {
        const lastRepeatAt = softDropState.lastRepeatAt ?? softDropState.pressedAt;

        if (timestamp - lastRepeatAt >= 33) {
          input.commands.softDrop();
          softDropState.lastRepeatAt = timestamp;
        }
      }
    },
  };
}
