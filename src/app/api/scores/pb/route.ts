import { type GameMode } from "@prisma/client";
import { NextResponse } from "next/server";
import { getDatabaseReadiness, getUserPB } from "@/db/queries";

type PersonalBestResponse = {
  readonly databaseReady: boolean;
  readonly personalBest: number;
};

function isGameMode(value: string | null): value is GameMode {
  return value === "CLASSIC" || value === "ZEN" || value === "SPRINT" || value === "BLITZ";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") ?? "";
  const modeParam = searchParams.get("mode");
  const mode: GameMode = isGameMode(modeParam) ? modeParam : "CLASSIC";

  if (userId.length === 0 || getDatabaseReadiness() !== "ready") {
    return NextResponse.json<PersonalBestResponse>({
      databaseReady: false,
      personalBest: 0,
    });
  }

  try {
    const personalBest = await getUserPB(userId, mode);

    return NextResponse.json<PersonalBestResponse>({
      databaseReady: true,
      personalBest,
    });
  } catch {
    return NextResponse.json<PersonalBestResponse>({
      databaseReady: false,
      personalBest: 0,
    });
  }
}
