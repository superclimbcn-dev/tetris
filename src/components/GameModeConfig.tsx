import type { GameMode } from "@/engine/types/game";

export type GameModeConfig = {
  readonly mode: GameMode;
  readonly title: string;
  readonly description: string;
  readonly hudLabel: string;
  readonly leaderboardLabel: string;
  readonly isCompetitive: boolean;
};

export const GAME_MODE_CONFIG: Record<GameMode, GameModeConfig> = {
  CLASSIC: {
    mode: "CLASSIC",
    title: "Classic",
    description: "Guideline-style endless score chase with level ramp and full leaderboard support.",
    hudLabel: "Score",
    leaderboardLabel: "Top Classic scores",
    isCompetitive: true,
  },
  ZEN: {
    mode: "ZEN",
    title: "Zen",
    description: "Relaxed endless flow with gentle gravity, no hard fail state, and no competitive pressure.",
    hudLabel: "Flow Score",
    leaderboardLabel: "Zen sessions",
    isCompetitive: false,
  },
  SPRINT: {
    mode: "SPRINT",
    title: "Sprint",
    description: "Clear 40 lines as fast as possible. Lower time is better.",
    hudLabel: "Time",
    leaderboardLabel: "Fastest 40 lines",
    isCompetitive: true,
  },
  BLITZ: {
    mode: "BLITZ",
    title: "Blitz",
    description: "Two-minute score attack with an accelerating endgame.",
    hudLabel: "Score",
    leaderboardLabel: "Top Blitz scores",
    isCompetitive: true,
  },
};

export function getGameModeConfig(mode: GameMode): GameModeConfig {
  return GAME_MODE_CONFIG[mode];
}
