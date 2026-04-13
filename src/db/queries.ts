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

export type UserIdentity = {
  readonly id: string;
  readonly name: string | null;
  readonly image: string | null;
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
  userId: true,
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

export type SaveScoreInput = {
  readonly userId: string;
  readonly mode: GameMode;
  readonly score: number;
  readonly level: number;
  readonly lines: number;
};

export type SaveScoreResult = {
  readonly entry: LeaderboardEntry;
  readonly personalBest: number;
  readonly isNewPersonalBest: boolean;
};

export function getDatabaseReadiness(): DatabaseReadiness {
  return process.env.DATABASE_URL && process.env.DIRECT_URL ? "ready" : "missing-env";
}

function isLowerScoreBetter(mode: GameMode): boolean {
  return mode === "SPRINT";
}

function guestNameFromId(guestId: string): string {
  return `Guest ${guestId.slice(-6).toUpperCase()}`;
}

export async function createUser(guestId: string): Promise<UserIdentity> {
  const user = await prisma.user.upsert({
    where: { id: guestId },
    update: {},
    create: {
      id: guestId,
      name: guestNameFromId(guestId),
    },
    select: {
      id: true,
      name: true,
      image: true,
    },
  });

  return user;
}

export async function ensureUser(userId: string): Promise<UserIdentity> {
  return createUser(userId);
}

export async function getUserSettings(userId: string): Promise<PersistedUserSettings> {
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

export async function upsertUserSettings(input: {
  readonly userId: string;
  readonly das: number;
  readonly arr: number;
  readonly sfxVolume: number;
  readonly musicVolume: number;
  readonly theme: string;
  readonly ghostEnabled: boolean;
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

export async function getLeaderboard(
  mode: GameMode,
  limit = 10,
): Promise<LeaderboardEntry[]> {
  return prisma.scoreEntry.findMany({
    where: { mode },
    select: leaderboardEntrySelect,
    orderBy: isLowerScoreBetter(mode)
      ? [{ score: "asc" }, { lines: "desc" }, { timestamp: "asc" }]
      : [{ score: "desc" }, { lines: "desc" }, { timestamp: "asc" }],
    take: limit,
  });
}

export async function getUserPB(userId: string, mode: GameMode): Promise<number> {
  const topScore = await prisma.scoreEntry.findFirst({
    where: { userId, mode },
    orderBy: isLowerScoreBetter(mode)
      ? [{ score: "asc" }, { lines: "desc" }, { timestamp: "asc" }]
      : [{ score: "desc" }, { lines: "desc" }, { timestamp: "asc" }],
    select: {
      score: true,
    },
  });

  return topScore?.score ?? 0;
}

export async function saveScore(input: SaveScoreInput): Promise<SaveScoreResult> {
  return prisma.$transaction(async (transaction) => {
    await transaction.user.upsert({
      where: { id: input.userId },
      update: {},
      create: {
        id: input.userId,
        name: guestNameFromId(input.userId),
      },
    });

    const previousBest = await transaction.scoreEntry.findFirst({
      where: {
        userId: input.userId,
        mode: input.mode,
      },
      orderBy: isLowerScoreBetter(input.mode)
        ? [{ score: "asc" }, { lines: "desc" }, { timestamp: "asc" }]
        : [{ score: "desc" }, { lines: "desc" }, { timestamp: "asc" }],
      select: {
        id: true,
        score: true,
      },
    });

    const isNewPersonalBest =
      previousBest === null
        ? true
        : isLowerScoreBetter(input.mode)
          ? input.score < previousBest.score
          : input.score > previousBest.score;

    if (isNewPersonalBest) {
      await transaction.scoreEntry.updateMany({
        where: {
          userId: input.userId,
          mode: input.mode,
          isPB: true,
        },
        data: {
          isPB: false,
        },
      });
    }

    const createdEntry = await transaction.scoreEntry.create({
      data: {
        userId: input.userId,
        score: input.score,
        level: input.level,
        lines: input.lines,
        mode: input.mode,
        isPB: isNewPersonalBest,
      },
      select: leaderboardEntrySelect,
    });

    return {
      entry: createdEntry,
      personalBest:
        previousBest === null
          ? input.score
          : isLowerScoreBetter(input.mode)
            ? Math.min(previousBest.score, input.score)
            : Math.max(previousBest.score, input.score),
      isNewPersonalBest,
    };
  });
}

export async function createGameSession(userId: string, mode: GameMode) {
  await ensureUser(userId);

  return prisma.gameSession.create({
    data: {
      userId,
      mode,
    },
  });
}

export async function endGameSession(
  sessionId: string,
  score: number,
  lines: number,
  level?: number,
) {
  return prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      finalScore: score,
      linesCleared: lines,
      maxLevel: level,
      endTime: new Date(),
    },
  });
}
