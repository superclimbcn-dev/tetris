"use client";

import { useEffect, useRef, useState } from "react";
import { canPlacePiece, translatePiece } from "@/engine/core/collision";
import { createSevenBagState, drawFromBag, peekNextPieces, type SevenBagState } from "@/engine/core/rng";
import { tryRotatePiece } from "@/engine/core/rotation";
import { applyScoreEvent, getClearType } from "@/engine/core/scoring";
import {
  createKeyboardController,
  DEFAULT_KEYBOARD_BINDINGS,
  type KeyboardTiming,
} from "@/input/keyboard";
import { attachTouchControls } from "@/input/touch";
import { createEmptyBoard, type ActivePiece, clearLines, lockPiece } from "@/engine/types/board";
import {
  createInitialGameState,
  transitionGameState,
  type CoreGameState,
  type GameMode,
} from "@/engine/types/game";
import { getTetrominoDefinition, type TetrominoType } from "@/engine/types/tetromino";

const PREVIEW_COUNT = 5;
const DEFAULT_INPUT_TIMING: KeyboardTiming = {
  dasMs: 167,
  arrMs: 33,
};
const BLITZ_DURATION_MS = 120_000;
const SPRINT_TARGET_LINES = 40;

export type GameFeedbackEventKind =
  | "move"
  | "rotate"
  | "hold"
  | "hard-drop"
  | "lock"
  | "clear"
  | "pause"
  | "resume"
  | "game-over"
  | "mode-complete"
  | "toast"
  | "level-up";

export type GameFeedbackEvent = {
  readonly kind: GameFeedbackEventKind;
  readonly at: number;
  readonly clearedLines: number;
  readonly clearedRows: readonly number[];
  readonly message?: string;
};

export type GameSnapshot = CoreGameState & {
  readonly ghostPiece: ActivePiece | null;
  readonly recentEvent: GameFeedbackEvent | null;
  readonly elapsedMs: number;
  readonly remainingMs: number;
  readonly targetLines: number | null;
  readonly isModeComplete: boolean;
  readonly displayMetric: number;
};

export type GameCommands = {
  readonly restart: () => void;
  readonly pause: () => void;
  readonly resume: () => void;
  readonly moveLeft: () => void;
  readonly moveRight: () => void;
  readonly softDrop: () => void;
  readonly hardDrop: () => void;
  readonly rotateClockwise: () => void;
  readonly rotateCounterClockwise: () => void;
  readonly hold: () => void;
};

type UseGameResult = {
  readonly snapshot: GameSnapshot;
  readonly commands: GameCommands;
  readonly setSurfaceElement: (element: HTMLDivElement | null) => void;
};

type UseGameOptions = {
  readonly mode?: GameMode;
  readonly timing?: KeyboardTiming;
};

type RuntimeRefs = {
  readonly mode: GameMode;
  elapsedMs: number;
  remainingMs: number;
  isModeComplete: boolean;
};

function createSpawnPiece(type: TetrominoType): ActivePiece {
  const definition = getTetrominoDefinition(type);

  return {
    type,
    rotation: 0,
    position: definition.spawnOrigin,
  };
}

function getGhostPiece(board: CoreGameState["board"], piece: ActivePiece | null): ActivePiece | null {
  if (piece === null) {
    return null;
  }

  let ghost = piece;

  while (true) {
    const nextGhost = translatePiece(ghost, { x: 0, y: 1 });

    if (!canPlacePiece(board, nextGhost)) {
      return ghost;
    }

    ghost = nextGhost;
  }
}

function getInitialRemainingMs(mode: GameMode): number {
  return mode === "BLITZ" ? BLITZ_DURATION_MS : 0;
}

function getTargetLines(mode: GameMode): number | null {
  return mode === "SPRINT" ? SPRINT_TARGET_LINES : null;
}

function getDisplayMetric(mode: GameMode, state: CoreGameState, elapsedMs: number): number {
  if (mode === "SPRINT") {
    return elapsedMs;
  }

  return state.score.score;
}

function toSnapshot(state: CoreGameState, runtime: RuntimeRefs): GameSnapshot {
  return {
    ...state,
    ghostPiece: getGhostPiece(state.board, state.activePiece),
    recentEvent: null,
    elapsedMs: runtime.elapsedMs,
    remainingMs: runtime.remainingMs,
    targetLines: getTargetLines(runtime.mode),
    isModeComplete: runtime.isModeComplete,
    displayMetric: getDisplayMetric(runtime.mode, state, runtime.elapsedMs),
  };
}

function getGravityIntervalMs(mode: GameMode, level: number, remainingMs: number): number {
  if (mode === "ZEN") {
    return 1200;
  }

  if (mode === "BLITZ") {
    if (remainingMs <= 30_000) {
      return 180;
    }

    if (remainingMs <= 60_000) {
      return 300;
    }

    return 520;
  }

  if (mode === "SPRINT") {
    return Math.max(90, 780 - (level - 1) * 35);
  }

  return Math.max(80, 900 - (level - 1) * 65);
}

function nextLevel(mode: GameMode, linesCleared: number): number {
  if (mode === "ZEN") {
    return 1;
  }

  return Math.max(1, Math.floor(linesCleared / 10) + 1);
}

function shouldIgnoreKeyboardEvent(event: KeyboardEvent): boolean {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

function createRuntimeRefs(mode: GameMode): RuntimeRefs {
  return {
    mode,
    elapsedMs: 0,
    remainingMs: getInitialRemainingMs(mode),
    isModeComplete: false,
  };
}

export function useGame(options: UseGameOptions = {}): UseGameResult {
  const mode = options.mode ?? "CLASSIC";
  const inputTiming = options.timing ?? DEFAULT_INPUT_TIMING;
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() =>
    toSnapshot(createInitialGameState(mode), createRuntimeRefs(mode)),
  );
  const [surfaceElement, setSurfaceElement] = useState<HTMLDivElement | null>(null);

  const snapshotRef = useRef(snapshot);
  const bagRef = useRef<SevenBagState | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const dropAccumulatorRef = useRef(0);
  const commandsRef = useRef<GameCommands | null>(null);
  const runtimeRef = useRef<RuntimeRefs>(createRuntimeRefs(mode));

  const commitSnapshot = (nextSnapshot: GameSnapshot) => {
    snapshotRef.current = nextSnapshot;
    setSnapshot(nextSnapshot);
  };

  const commitState = (
    nextState: CoreGameState,
    event?: Omit<GameFeedbackEvent, "at">,
  ) => {
    commitSnapshot({
      ...toSnapshot(nextState, runtimeRef.current),
      recentEvent:
        event === undefined
          ? snapshotRef.current.recentEvent
          : {
              ...event,
              at: performance.now(),
            },
    });
  };

  const spawnFromBag = (
    baseSnapshot: GameSnapshot,
    holdLocked = false,
  ): GameSnapshot => {
    const currentBag = bagRef.current ?? createSevenBagState();
    const draw = drawFromBag(currentBag);
    bagRef.current = draw.state;

    const nextPiece = createSpawnPiece(draw.piece);
    const spawned = transitionGameState(baseSnapshot, {
      type: "SPAWN_PIECE",
      piece: nextPiece,
    });
    const updatedQueue = transitionGameState(spawned, {
      type: "UPDATE_QUEUE",
      next: peekNextPieces(draw.state, PREVIEW_COUNT),
      hold: spawned.queue.hold,
      holdLocked,
    });

    if (canPlacePiece(updatedQueue.board, nextPiece)) {
      return toSnapshot(updatedQueue, runtimeRef.current);
    }

    if (mode === "ZEN") {
      const resetBoardState = {
        ...updatedQueue,
        board: createEmptyBoard(),
      };
      const zenSpawn = transitionGameState(resetBoardState, {
        type: "SPAWN_PIECE",
        piece: nextPiece,
      });
      return toSnapshot(zenSpawn, runtimeRef.current);
    }

    return toSnapshot(
      transitionGameState(
        {
          ...updatedQueue,
          activePiece: null,
        },
        { type: "GAME_OVER" },
      ),
      runtimeRef.current,
    );
  };

  const createModeCompleteEvent = (message: string): GameFeedbackEvent => ({
    kind: "mode-complete",
    message,
    clearedLines: 0,
    clearedRows: [],
    at: performance.now(),
  });

  const lockCurrentPiece = () => {
    const currentSnapshot = snapshotRef.current;
    const activePiece = currentSnapshot.activePiece;

    if (activePiece === null) {
      return;
    }

    const lockedBoard = lockPiece(currentSnapshot.board, activePiece);
    const clearResult = clearLines(lockedBoard);
    const clearType = getClearType(clearResult.clearedLines, false);
    const scoreBreakdown = applyScoreEvent(currentSnapshot.score, {
      level: currentSnapshot.score.level,
      linesCleared: clearResult.clearedLines,
      clearType,
      isBackToBackEligible: true,
    });
    const leveledScore = {
      ...scoreBreakdown.nextScoreState,
      level: nextLevel(mode, scoreBreakdown.nextScoreState.linesCleared),
    };
    const scoredState = transitionGameState(
      {
        ...currentSnapshot,
        board: clearResult.board,
        activePiece: null,
      },
      {
        type: "UPDATE_SCORE",
        score: leveledScore,
      },
    );

    if (mode === "SPRINT" && leveledScore.linesCleared >= SPRINT_TARGET_LINES) {
      runtimeRef.current.isModeComplete = true;
      const completedState = transitionGameState(scoredState, { type: "GAME_OVER" });
      commitSnapshot({
        ...toSnapshot(completedState, runtimeRef.current),
        recentEvent: createModeCompleteEvent("Sprint clear! 40 lines finished."),
      });
      return;
    }

    const nextSnapshot = spawnFromBag(toSnapshot(scoredState, runtimeRef.current));
    const nextEvent =
      nextSnapshot.phase === "GAME_OVER"
        ? {
            kind: "game-over" as const,
            clearedLines: clearResult.clearedLines,
            clearedRows: clearResult.clearedRowIndexes,
          }
        : clearResult.clearedLines > 0
          ? {
              kind: "clear" as const,
              clearedLines: clearResult.clearedLines,
              clearedRows: clearResult.clearedRowIndexes,
            }
          : {
              kind: "lock" as const,
              clearedLines: 0,
              clearedRows: [],
            };

    const leveledUp = currentSnapshot.score.level !== leveledScore.level;

    commitSnapshot({
      ...nextSnapshot,
      recentEvent: leveledUp
        ? {
            kind: "level-up",
            message: `Level ${leveledScore.level}`,
            clearedLines: clearResult.clearedLines,
            clearedRows: clearResult.clearedRowIndexes,
            at: performance.now(),
          }
        : {
            ...nextEvent,
            at: performance.now(),
          },
    });
  };

  const movePiece = (deltaX: number, deltaY: number): boolean => {
    const currentSnapshot = snapshotRef.current;
    const activePiece = currentSnapshot.activePiece;

    if (
      activePiece === null ||
      (currentSnapshot.phase !== "PLAYING" && currentSnapshot.phase !== "ZONE_ACTIVE")
    ) {
      return false;
    }

    const movedPiece = translatePiece(activePiece, { x: deltaX, y: deltaY });

    if (!canPlacePiece(currentSnapshot.board, movedPiece)) {
      return false;
    }

    commitState(
      {
        ...currentSnapshot,
        activePiece: movedPiece,
      },
      deltaX === 0
        ? undefined
        : {
            kind: "move",
            clearedLines: 0,
            clearedRows: [],
          },
    );

    return true;
  };

  const resetRuntime = () => {
    runtimeRef.current = createRuntimeRefs(mode);
    lastFrameRef.current = null;
    dropAccumulatorRef.current = 0;
  };

  const commands: GameCommands = {
    restart: () => {
      const bagState = createSevenBagState();
      const firstDraw = drawFromBag(bagState);
      bagRef.current = firstDraw.state;
      resetRuntime();
      const firstPiece = createSpawnPiece(firstDraw.piece);
      const started = transitionGameState(createInitialGameState(mode), {
        type: "START",
        mode,
        firstPiece,
      });
      const queued = transitionGameState(started, {
        type: "UPDATE_QUEUE",
        next: peekNextPieces(firstDraw.state, PREVIEW_COUNT),
        hold: null,
        holdLocked: false,
      });
      commitSnapshot(toSnapshot(queued, runtimeRef.current));
    },
    pause: () => {
      commitState(transitionGameState(snapshotRef.current, { type: "PAUSE" }), {
        kind: "pause",
        clearedLines: 0,
        clearedRows: [],
      });
    },
    resume: () => {
      commitState(transitionGameState(snapshotRef.current, { type: "RESUME" }), {
        kind: "resume",
        clearedLines: 0,
        clearedRows: [],
      });
    },
    moveLeft: () => {
      movePiece(-1, 0);
    },
    moveRight: () => {
      movePiece(1, 0);
    },
    softDrop: () => {
      if (!movePiece(0, 1)) {
        lockCurrentPiece();
      }
    },
    hardDrop: () => {
      const currentSnapshot = snapshotRef.current;
      const ghostPiece = currentSnapshot.ghostPiece;

      if (
        ghostPiece === null ||
        (currentSnapshot.phase !== "PLAYING" && currentSnapshot.phase !== "ZONE_ACTIVE")
      ) {
        return;
      }

      commitState(
        {
          ...currentSnapshot,
          activePiece: ghostPiece,
        },
        {
          kind: "hard-drop",
          clearedLines: 0,
          clearedRows: [],
        },
      );
      lockCurrentPiece();
    },
    rotateClockwise: () => {
      const currentSnapshot = snapshotRef.current;
      const activePiece = currentSnapshot.activePiece;

      if (
        activePiece === null ||
        (currentSnapshot.phase !== "PLAYING" && currentSnapshot.phase !== "ZONE_ACTIVE")
      ) {
        return;
      }

      const result = tryRotatePiece(currentSnapshot.board, activePiece, "CW");

      if (result.success) {
        commitState(
          {
            ...currentSnapshot,
            activePiece: result.piece,
          },
          {
            kind: "rotate",
            clearedLines: 0,
            clearedRows: [],
          },
        );
      }
    },
    rotateCounterClockwise: () => {
      const currentSnapshot = snapshotRef.current;
      const activePiece = currentSnapshot.activePiece;

      if (
        activePiece === null ||
        (currentSnapshot.phase !== "PLAYING" && currentSnapshot.phase !== "ZONE_ACTIVE")
      ) {
        return;
      }

      const result = tryRotatePiece(currentSnapshot.board, activePiece, "CCW");

      if (result.success) {
        commitState(
          {
            ...currentSnapshot,
            activePiece: result.piece,
          },
          {
            kind: "rotate",
            clearedLines: 0,
            clearedRows: [],
          },
        );
      }
    },
    hold: () => {
      const currentSnapshot = snapshotRef.current;
      const activePiece = currentSnapshot.activePiece;

      if (
        activePiece === null ||
        currentSnapshot.queue.holdLocked ||
        (currentSnapshot.phase !== "PLAYING" && currentSnapshot.phase !== "ZONE_ACTIVE")
      ) {
        return;
      }

      if (currentSnapshot.queue.hold === null) {
        const heldState = transitionGameState(currentSnapshot, {
          type: "UPDATE_QUEUE",
          next: currentSnapshot.queue.next,
          hold: activePiece.type,
          holdLocked: true,
        });

        const nextSnapshot = spawnFromBag(
          toSnapshot(
            {
              ...heldState,
              activePiece: null,
              queue: {
                ...heldState.queue,
                hold: activePiece.type,
                holdLocked: true,
              },
            },
            runtimeRef.current,
          ),
          true,
        );
        commitSnapshot({
          ...nextSnapshot,
          recentEvent: {
            kind: "hold",
            at: performance.now(),
            clearedLines: 0,
            clearedRows: [],
          },
        });
        return;
      }

      const swappedPiece = createSpawnPiece(currentSnapshot.queue.hold);
      const nextQueueState = {
        ...currentSnapshot.queue,
        hold: activePiece.type,
        holdLocked: true,
      };

      if (!canPlacePiece(currentSnapshot.board, swappedPiece) && mode !== "ZEN") {
        commitState(
          transitionGameState(
            {
              ...currentSnapshot,
              activePiece: null,
              queue: nextQueueState,
            },
            { type: "GAME_OVER" },
          ),
          {
            kind: "game-over",
            clearedLines: 0,
            clearedRows: [],
          },
        );
        return;
      }

      commitState(
        {
          ...currentSnapshot,
          activePiece: swappedPiece,
          queue: nextQueueState,
        },
        {
          kind: "hold",
          clearedLines: 0,
          clearedRows: [],
        },
      );
    },
  };

  commandsRef.current = commands;

  useEffect(() => {
    const keyboardController = createKeyboardController({
      bindings: DEFAULT_KEYBOARD_BINDINGS,
      timing: inputTiming,
      commands: {
        moveLeft: () => commandsRef.current?.moveLeft(),
        moveRight: () => commandsRef.current?.moveRight(),
        softDrop: () => commandsRef.current?.softDrop(),
        hardDrop: () => commandsRef.current?.hardDrop(),
        hold: () => commandsRef.current?.hold(),
        rotateClockwise: () => commandsRef.current?.rotateClockwise(),
        rotateCounterClockwise: () => commandsRef.current?.rotateCounterClockwise(),
        togglePause: () => {
          if (snapshotRef.current.phase === "PAUSED") {
            commandsRef.current?.resume();
          } else {
            commandsRef.current?.pause();
          }
        },
      },
      shouldIgnoreKeyboardEvent,
    });

    const handleKeyDown = (event: KeyboardEvent) => keyboardController.handleKeyDown(event);
    const handleKeyUp = (event: KeyboardEvent) => keyboardController.handleKeyUp(event);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    let frameId = 0;
    const tick = (timestamp: number) => {
      keyboardController.update(timestamp);
      frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.cancelAnimationFrame(frameId);
    };
  }, [inputTiming.arrMs, inputTiming.dasMs]);

  useEffect(() => {
    if (surfaceElement === null) {
      return;
    }

    return attachTouchControls({
      element: surfaceElement,
      commands: {
        tap: () => commandsRef.current?.rotateClockwise(),
        doubleTap: () => commandsRef.current?.hardDrop(),
        swipeLeft: () => commandsRef.current?.moveLeft(),
        swipeRight: () => commandsRef.current?.moveRight(),
        swipeDown: () => commandsRef.current?.softDrop(),
      },
    });
  }, [surfaceElement]);

  useEffect(() => {
    commands.restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    let frameId = 0;

    const tick = (timestamp: number) => {
      const currentSnapshot = snapshotRef.current;

      if (lastFrameRef.current === null) {
        lastFrameRef.current = timestamp;
      }

      const deltaMs = timestamp - lastFrameRef.current;
      lastFrameRef.current = timestamp;

      if (currentSnapshot.phase === "PLAYING" || currentSnapshot.phase === "ZONE_ACTIVE") {
        runtimeRef.current.elapsedMs += deltaMs;

        if (mode === "BLITZ") {
          runtimeRef.current.remainingMs = Math.max(0, runtimeRef.current.remainingMs - deltaMs);

          if (runtimeRef.current.remainingMs === 0) {
            runtimeRef.current.isModeComplete = true;
            commitSnapshot({
              ...toSnapshot(
                transitionGameState(currentSnapshot, { type: "GAME_OVER" }),
                runtimeRef.current,
              ),
              recentEvent: createModeCompleteEvent("Blitz complete! Time expired."),
            });
            frameId = window.requestAnimationFrame(tick);
            return;
          }
        }

        const gravityInterval = getGravityIntervalMs(
          mode,
          currentSnapshot.score.level,
          runtimeRef.current.remainingMs,
        );

        dropAccumulatorRef.current += deltaMs;

        while (dropAccumulatorRef.current >= gravityInterval) {
          dropAccumulatorRef.current -= gravityInterval;

          if (!movePiece(0, 1)) {
            lockCurrentPiece();
            dropAccumulatorRef.current = 0;
            break;
          }
        }

        commitSnapshot({
          ...snapshotRef.current,
          elapsedMs: runtimeRef.current.elapsedMs,
          remainingMs: runtimeRef.current.remainingMs,
          targetLines: getTargetLines(mode),
          isModeComplete: runtimeRef.current.isModeComplete,
          displayMetric: getDisplayMetric(mode, snapshotRef.current, runtimeRef.current.elapsedMs),
        });
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [mode]);

  return {
    snapshot,
    commands,
    setSurfaceElement,
  };
}
