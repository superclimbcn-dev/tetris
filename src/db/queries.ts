import { Prisma, type GameMode } from "@prisma/client";
import { prisma } from "@/db/client";

export type DatabaseReadiness = "missing-env" | "ready";
export type PersistedUserSettings = {
  readonly userId: string;
  readonly das: number;
  readonly arr: number;
  readonly sfxVolume: number;
  readonly musicVolume: number;
  readonly theme: string;
  readonly ghostEnabled: boolean;
};

export const DEFAULT_USER_SETTINGS: PersistedUserSettings = {
  userId: "local-player",
  das: 167,
  arr: 33,
  sfxVolume: 0.7,
  musicVolume: 0.5,
  theme: "neon",
  ghostEnabled: true,
};

export const leaderboardEntrySelect = Prisma.validator<Prisma.ScoreEntrySelect>()({
  id: true,
  score: true,
  level: true,
  lines: true,
  mode: true,
  timestamp: true,
  isPB: true,
  user: {
    select: {
      id: true,
      name: true,
      image: true,
    },
  },
});

export type LeaderboardEntry = Prisma.ScoreEntryGetPayload<{
  select: typeof leaderboardEntrySelect;
}>;

export function getDatabaseReadiness(): DatabaseReadiness {
  return process.env.DATABASE_URL && process.env.DIRECT_URL ? "ready" : "missing-env";
}

export async function ensureUser(userId: string) {
  return prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      name: "Local Player",
    },
  });
}

export async function getUserSettings(
  userId: string,
): Promise<PersistedUserSettings> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: {
      userId: true,
      das: true,
      arr: true,
      sfxVolume: true,
      musicVolume: true,
      theme: true,
      ghostEnabled: true,
    },
  });

  if (settings === null) {
    return {
      ...DEFAULT_USER_SETTINGS,
      userId,
    };
  }

  return settings;
}

export async function listTopScoresByMode(
  mode: GameMode,
  take = 10,
): Promise<LeaderboardEntry[]> {
  return prisma.scoreEntry.findMany({
    where: { mode },
    select: leaderboardEntrySelect,
    orderBy: [{ score: "desc" }, { timestamp: "asc" }],
    take,
  });
}

export async function createGameSession(userId: string, mode: GameMode) {
  return prisma.gameSession.create({
    data: {
      userId,
      mode,
    },
  });
}

export async function finishGameSession(input: {
  sessionId: string;
  finalScore: number;
  maxLevel: number;
  linesCleared: number;
  replayData?: Prisma.InputJsonValue;
}) {
  const { sessionId, ...data } = input;

  return prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      ...data,
      endTime: new Date(),
    },
  });
}

export async function upsertUserSettings(input: {
  userId: string;
  das: number;
  arr: number;
  sfxVolume: number;
  musicVolume: number;
  theme: string;
  ghostEnabled: boolean;
}) {
  const { userId, ...data } = input;
  await ensureUser(userId);

  return prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      ...data,
    },
    update: data,
  });
}
