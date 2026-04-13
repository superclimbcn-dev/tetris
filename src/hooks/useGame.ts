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
import { type ActivePiece, clearLines, lockPiece } from "@/engine/types/board";
import {
  createInitialGameState,
  transitionGameState,
  type CoreGameState,
  type GamePhase,
  type GameMode,
} from "@/engine/types/game";
import { getTetrominoDefinition, type TetrominoType } from "@/engine/types/tetromino";

const PREVIEW_COUNT = 5;
const DEFAULT_INPUT_TIMING: KeyboardTiming = {
  dasMs: 167,
  arrMs: 33,
};

export type GameSnapshot = CoreGameState & {
  readonly ghostPiece: ActivePiece | null;
  readonly recentEvent: GameFeedbackEvent | null;
};

export type GameFeedbackEventKind =
  | "move"
  | "rotate"
  | "hold"
  | "hard-drop"
  | "lock"
  | "clear"
  | "pause"
  | "resume"
  | "game-over";

export type GameFeedbackEvent = {
  readonly kind: GameFeedbackEventKind;
  readonly at: number;
  readonly clearedLines: number;
  readonly clearedRows: readonly number[];
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

function toSnapshot(state: CoreGameState): GameSnapshot {
  return {
    ...state,
    ghostPiece: getGhostPiece(state.board, state.activePiece),
    recentEvent: null,
  };
}

function getGravityIntervalMs(level: number, phase: GamePhase): number {
  if (phase === "ZONE_ACTIVE") {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(80, 900 - (level - 1) * 65);
}

function createRuntimeState(mode: GameMode): {
  readonly snapshot: GameSnapshot;
  readonly bag: SevenBagState;
} {
  const bagState = createSevenBagState();
  const firstDraw = drawFromBag(bagState);
  const firstPiece = createSpawnPiece(firstDraw.piece);
  const baseState = createInitialGameState(mode);
  const started = transitionGameState(baseState, {
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

  if (!canPlacePiece(queued.board, firstPiece)) {
    return {
      bag: firstDraw.state,
      snapshot: toSnapshot(
        transitionGameState(
          {
            ...queued,
            activePiece: null,
          },
          { type: "GAME_OVER" },
        ),
      ),
    };
  }

  return {
    bag: firstDraw.state,
    snapshot: toSnapshot(queued),
  };
}

function nextLevel(linesCleared: number): number {
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

export function useGame(inputTiming: KeyboardTiming = DEFAULT_INPUT_TIMING): UseGameResult {
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() =>
    toSnapshot(createInitialGameState("CLASSIC")),
  );
  const [surfaceElement, setSurfaceElement] = useState<HTMLDivElement | null>(null);

  const snapshotRef = useRef(snapshot);
  const bagRef = useRef<SevenBagState | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const dropAccumulatorRef = useRef(0);
  const commandsRef = useRef<GameCommands | null>(null);

  const commitSnapshot = (nextSnapshot: GameSnapshot) => {
    snapshotRef.current = nextSnapshot;
    setSnapshot(nextSnapshot);
  };

  const commitState = (
    nextState: CoreGameState,
    event?: Omit<GameFeedbackEvent, "at">,
  ) => {
    commitSnapshot({
      ...toSnapshot(nextState),
      recentEvent:
        event === undefined
          ? snapshotRef.current.recentEvent
          : {
              ...event,
              at: performance.now(),
            },
    });
  };

  const spawnNextPiece = (
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

    if (!canPlacePiece(updatedQueue.board, nextPiece)) {
      return toSnapshot(
        transitionGameState(
          {
            ...updatedQueue,
            activePiece: null,
          },
          { type: "GAME_OVER" },
        ),
      );
    }

    return toSnapshot(updatedQueue);
  };

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
      level: nextLevel(scoreBreakdown.nextScoreState.linesCleared),
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

    const nextSnapshot = spawnNextPiece(toSnapshot(scoredState));
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

    commitSnapshot({
      ...nextSnapshot,
      recentEvent: {
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

  const commands: GameCommands = {
    restart: () => {
      const runtime = createRuntimeState("CLASSIC");
      bagRef.current = runtime.bag;
      lastFrameRef.current = null;
      dropAccumulatorRef.current = 0;
      commitSnapshot(runtime.snapshot);
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

        const nextSnapshot = spawnNextPiece(
          toSnapshot({
            ...heldState,
            activePiece: null,
            queue: {
              ...heldState.queue,
              hold: activePiece.type,
              holdLocked: true,
            },
          }),
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

      if (!canPlacePiece(currentSnapshot.board, swappedPiece)) {
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
    const runtime = createRuntimeState("CLASSIC");
    bagRef.current = runtime.bag;
    commitSnapshot(runtime.snapshot);
  }, []);

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
        const gravityInterval = getGravityIntervalMs(
          currentSnapshot.score.level,
          currentSnapshot.phase,
        );

        if (Number.isFinite(gravityInterval)) {
          dropAccumulatorRef.current += deltaMs;

          while (dropAccumulatorRef.current >= gravityInterval) {
            dropAccumulatorRef.current -= gravityInterval;

            if (!movePiece(0, 1)) {
              lockCurrentPiece();
              dropAccumulatorRef.current = 0;
              break;
            }
          }
        }
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return {
    snapshot,
    commands,
    setSurfaceElement,
  };
}
