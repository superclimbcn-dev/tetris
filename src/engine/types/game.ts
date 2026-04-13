import type { ActivePiece, BoardMatrix } from "@/engine/types/board";
import { createEmptyBoard } from "@/engine/types/board";
import type { TetrominoType } from "@/engine/types/tetromino";

export const GAME_PHASES = [
  "IDLE",
  "PLAYING",
  "PAUSED",
  "GAME_OVER",
  "ZONE_ACTIVE",
] as const;

export type GamePhase = (typeof GAME_PHASES)[number];

export type GameMode = "CLASSIC" | "ZEN" | "SPRINT" | "BLITZ";

export type FrameTiming = {
  readonly dasMs: number;
  readonly arrMs: number;
  readonly lockDelayMs: number;
  readonly softDropMultiplier: number;
};

export type ScoreState = {
  readonly score: number;
  readonly level: number;
  readonly linesCleared: number;
  readonly combo: number;
  readonly backToBack: boolean;
};

export type ZoneState = {
  readonly charge: number;
  readonly isActive: boolean;
  readonly remainingMs: number;
};

export type QueueState = {
  readonly next: readonly TetrominoType[];
  readonly hold: TetrominoType | null;
  readonly holdLocked: boolean;
};

export type CoreGameState = {
  readonly phase: GamePhase;
  readonly mode: GameMode;
  readonly board: BoardMatrix;
  readonly activePiece: ActivePiece | null;
  readonly queue: QueueState;
  readonly timing: FrameTiming;
  readonly score: ScoreState;
  readonly zone: ZoneState;
};

export type GameEvent =
  | { readonly type: "START"; readonly mode: GameMode; readonly firstPiece: ActivePiece }
  | { readonly type: "PAUSE" }
  | { readonly type: "RESUME" }
  | { readonly type: "GAME_OVER" }
  | { readonly type: "ACTIVATE_ZONE"; readonly durationMs: number }
  | { readonly type: "TICK_ZONE"; readonly elapsedMs: number }
  | { readonly type: "DEACTIVATE_ZONE" }
  | { readonly type: "SPAWN_PIECE"; readonly piece: ActivePiece }
  | { readonly type: "LOCK_HOLD" }
  | {
      readonly type: "UPDATE_QUEUE";
      readonly next: readonly TetrominoType[];
      readonly hold: TetrominoType | null;
      readonly holdLocked: boolean;
    }
  | {
      readonly type: "UPDATE_SCORE";
      readonly score: ScoreState;
    };

export const DEFAULT_TIMING: FrameTiming = {
  dasMs: 167,
  arrMs: 33,
  lockDelayMs: 500,
  softDropMultiplier: 20,
};

export const DEFAULT_SCORE_STATE: ScoreState = {
  score: 0,
  level: 1,
  linesCleared: 0,
  combo: -1,
  backToBack: false,
};

export const DEFAULT_ZONE_STATE: ZoneState = {
  charge: 0,
  isActive: false,
  remainingMs: 0,
};

export const DEFAULT_QUEUE_STATE: QueueState = {
  next: [],
  hold: null,
  holdLocked: false,
};

export function createInitialGameState(mode: GameMode = "CLASSIC"): CoreGameState {
  return {
    phase: "IDLE",
    mode,
    board: createEmptyBoard(),
    activePiece: null,
    queue: DEFAULT_QUEUE_STATE,
    timing: DEFAULT_TIMING,
    score: DEFAULT_SCORE_STATE,
    zone: DEFAULT_ZONE_STATE,
  };
}

export function transitionGameState(
  state: CoreGameState,
  event: GameEvent,
): CoreGameState {
  switch (event.type) {
    case "START":
      return {
        ...createInitialGameState(event.mode),
        phase: "PLAYING",
        activePiece: event.firstPiece,
      };

    case "PAUSE":
      if (state.phase !== "PLAYING" && state.phase !== "ZONE_ACTIVE") {
        return state;
      }

      return {
        ...state,
        phase: "PAUSED",
      };

    case "RESUME":
      if (state.phase !== "PAUSED") {
        return state;
      }

      return {
        ...state,
        phase: state.zone.isActive ? "ZONE_ACTIVE" : "PLAYING",
      };

    case "GAME_OVER":
      return {
        ...state,
        phase: "GAME_OVER",
      };

    case "ACTIVATE_ZONE":
      if (state.phase !== "PLAYING") {
        return state;
      }

      return {
        ...state,
        phase: "ZONE_ACTIVE",
        zone: {
          ...state.zone,
          isActive: true,
          remainingMs: event.durationMs,
        },
      };

    case "TICK_ZONE":
      if (!state.zone.isActive) {
        return state;
      }

      return {
        ...state,
        zone: {
          ...state.zone,
          remainingMs: Math.max(0, state.zone.remainingMs - event.elapsedMs),
        },
      };

    case "DEACTIVATE_ZONE":
      return {
        ...state,
        phase: state.phase === "GAME_OVER" ? "GAME_OVER" : "PLAYING",
        zone: {
          ...state.zone,
          isActive: false,
          remainingMs: 0,
        },
      };

    case "SPAWN_PIECE":
      return {
        ...state,
        activePiece: event.piece,
        queue: {
          ...state.queue,
          holdLocked: false,
        },
      };

    case "LOCK_HOLD":
      return {
        ...state,
        queue: {
          ...state.queue,
          holdLocked: true,
        },
      };

    case "UPDATE_QUEUE":
      return {
        ...state,
        queue: {
          next: event.next,
          hold: event.hold,
          holdLocked: event.holdLocked,
        },
      };

    case "UPDATE_SCORE":
      return {
        ...state,
        score: event.score,
      };
  }
}
