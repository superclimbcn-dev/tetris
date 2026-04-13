import { type GameMode } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  getDatabaseReadiness,
  getLeaderboard,
  saveScore,
} from "@/db/queries";

type ScoresGetResponse = {
  readonly databaseReady: boolean;
  readonly scores: readonly {
    readonly id: string;
    readonly userId: string;
    readonly score: number;
    readonly level: number;
    readonly lines: number;
    readonly mode: GameMode;
    readonly timestamp: Date;
    readonly isPB: boolean;
    readonly user: {
      readonly id: string;
      readonly name: string | null;
      readonly image: string | null;
    };
  }[];
};

type ScoresPostRequest = {
  readonly userId?: string;
  readonly score?: number;
  readonly level?: number;
  readonly lines?: number;
  readonly mode?: GameMode;
};

type ScoresPostResponse = {
  readonly persisted: boolean;
  readonly databaseReady: boolean;
  readonly isNewPersonalBest: boolean;
  readonly personalBest: number;
};

function isGameMode(value: string | null): value is GameMode {
  return value === "CLASSIC" || value === "ZEN" || value === "SPRINT" || value === "BLITZ";
}

function getModeFromRequest(request: Request): GameMode {
  const { searchParams } = new URL(request.url);
  const modeParam = searchParams.get("mode");
  return isGameMode(modeParam) ? modeParam : "CLASSIC";
}

function getLimitFromRequest(request: Request): number {
  const { searchParams } = new URL(request.url);
  const parsedLimit = Number(searchParams.get("limit") ?? 10);

  if (!Number.isFinite(parsedLimit)) {
    return 10;
  }

  return Math.min(20, Math.max(1, Math.trunc(parsedLimit)));
}

export async function GET(request: Request) {
  if (getDatabaseReadiness() !== "ready") {
    return NextResponse.json<ScoresGetResponse>({
      databaseReady: false,
      scores: [],
    });
  }

  try {
    const scores = await getLeaderboard(getModeFromRequest(request), getLimitFromRequest(request));

    return NextResponse.json<ScoresGetResponse>({
      databaseReady: true,
      scores,
    });
  } catch {
    return NextResponse.json<ScoresGetResponse>({
      databaseReady: false,
      scores: [],
    });
  }
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ScoresPostRequest;
  const mode = payload.mode ?? "CLASSIC";
  const userId = payload.userId ?? "";
  const score = payload.score ?? 0;
  const level = payload.level ?? 1;
  const lines = payload.lines ?? 0;

  if (userId.length === 0) {
    return NextResponse.json<ScoresPostResponse>(
      {
        persisted: false,
        databaseReady: false,
        isNewPersonalBest: false,
        personalBest: 0,
      },
      { status: 400 },
    );
  }

  if (getDatabaseReadiness() !== "ready") {
    return NextResponse.json<ScoresPostResponse>({
      persisted: false,
      databaseReady: false,
      isNewPersonalBest: false,
      personalBest: score,
    });
  }

  try {
    const result = await saveScore({
      userId,
      mode,
      score,
      level,
      lines,
    });

    return NextResponse.json<ScoresPostResponse>({
      persisted: true,
      databaseReady: true,
      isNewPersonalBest: result.isNewPersonalBest,
      personalBest: result.personalBest,
    });
  } catch {
    return NextResponse.json<ScoresPostResponse>({
      persisted: false,
      databaseReady: false,
      isNewPersonalBest: false,
      personalBest: score,
    });
  }
}
