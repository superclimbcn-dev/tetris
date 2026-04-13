import type { ScoreState } from "@/engine/types/game";

export type ClearType =
  | "NONE"
  | "SINGLE"
  | "DOUBLE"
  | "TRIPLE"
  | "TETRIS"
  | "T_SPIN_MINI"
  | "T_SPIN_SINGLE"
  | "T_SPIN_DOUBLE"
  | "T_SPIN_TRIPLE";

export type ScoreEvent = {
  readonly level: number;
  readonly linesCleared: number;
  readonly clearType: ClearType;
  readonly isBackToBackEligible: boolean;
  readonly zoneChargeDelta?: number;
};

export type ScoreBreakdown = {
  readonly basePoints: number;
  readonly comboBonus: number;
  readonly backToBackBonus: number;
  readonly totalPoints: number;
  readonly nextScoreState: ScoreState;
};

type ClearPointsTable = Readonly<Record<ClearType, number>>;

const GUIDELINE_POINTS: ClearPointsTable = {
  NONE: 0,
  SINGLE: 100,
  DOUBLE: 300,
  TRIPLE: 500,
  TETRIS: 800,
  T_SPIN_MINI: 400,
  T_SPIN_SINGLE: 800,
  T_SPIN_DOUBLE: 1200,
  T_SPIN_TRIPLE: 1600,
};

export function isBackToBackClear(clearType: ClearType): boolean {
  return (
    clearType === "TETRIS" ||
    clearType === "T_SPIN_SINGLE" ||
    clearType === "T_SPIN_DOUBLE" ||
    clearType === "T_SPIN_TRIPLE"
  );
}

export function getClearType(linesCleared: number, isTSpin: boolean): ClearType {
  if (isTSpin) {
    if (linesCleared === 0) {
      return "T_SPIN_MINI";
    }

    if (linesCleared === 1) {
      return "T_SPIN_SINGLE";
    }

    if (linesCleared === 2) {
      return "T_SPIN_DOUBLE";
    }

    return "T_SPIN_TRIPLE";
  }

  if (linesCleared === 1) {
    return "SINGLE";
  }

  if (linesCleared === 2) {
    return "DOUBLE";
  }

  if (linesCleared === 3) {
    return "TRIPLE";
  }

  if (linesCleared >= 4) {
    return "TETRIS";
  }

  return "NONE";
}

export function getBaseClearPoints(clearType: ClearType, level: number): number {
  return GUIDELINE_POINTS[clearType] * level;
}

export function getComboBonus(combo: number, level: number): number {
  if (combo <= 0) {
    return 0;
  }

  return 50 * combo * level;
}

export function getBackToBackBonus(basePoints: number, enabled: boolean): number {
  if (!enabled) {
    return 0;
  }

  return Math.floor(basePoints * 0.5);
}

export function applyScoreEvent(
  current: ScoreState,
  event: ScoreEvent,
): ScoreBreakdown {
  const clearType = event.clearType;
  const basePoints = getBaseClearPoints(clearType, event.level);
  const nextCombo = event.linesCleared > 0 ? current.combo + 1 : -1;
  const comboBonus = getComboBonus(nextCombo, event.level);
  const b2bEligible = event.isBackToBackEligible && isBackToBackClear(clearType);
  const backToBackBonus = getBackToBackBonus(basePoints, current.backToBack && b2bEligible);
  const totalPoints = basePoints + comboBonus + backToBackBonus;

  return {
    basePoints,
    comboBonus,
    backToBackBonus,
    totalPoints,
    nextScoreState: {
      score: current.score + totalPoints,
      level: event.level,
      linesCleared: current.linesCleared + event.linesCleared,
      combo: nextCombo,
      backToBack: b2bEligible ? true : event.linesCleared > 0 ? false : current.backToBack,
    },
  };
}
