import { NextResponse } from "next/server";
import {
  DEFAULT_USER_SETTINGS,
  getDatabaseReadiness,
  getUserSettings,
  upsertUserSettings,
} from "@/db/queries";

type SettingsResponse = {
  readonly persisted: boolean;
  readonly databaseReady: boolean;
  readonly settings: {
    readonly userId: string;
    readonly das: number;
    readonly arr: number;
    readonly sfxVolume: number;
    readonly musicVolume: number;
    readonly theme: string;
    readonly ghostEnabled: boolean;
  };
};

type SettingsUpdateRequest = {
  readonly userId?: string;
  readonly das?: number;
  readonly arr?: number;
  readonly sfxVolume?: number;
  readonly musicVolume?: number;
  readonly theme?: string;
  readonly ghostEnabled?: boolean;
};

function getUserId(request: Request): string {
  const { searchParams } = new URL(request.url);
  return searchParams.get("userId") ?? DEFAULT_USER_SETTINGS.userId;
}

function buildFallbackResponse(userId: string): SettingsResponse {
  return {
    persisted: false,
    databaseReady: false,
    settings: {
      ...DEFAULT_USER_SETTINGS,
      userId,
    },
  };
}

export async function GET(request: Request) {
  const userId = getUserId(request);

  if (getDatabaseReadiness() !== "ready") {
    return NextResponse.json(buildFallbackResponse(userId));
  }

  try {
    const settings = await getUserSettings(userId);

    return NextResponse.json<SettingsResponse>({
      persisted: true,
      databaseReady: true,
      settings,
    });
  } catch {
    return NextResponse.json(buildFallbackResponse(userId));
  }
}

export async function PUT(request: Request) {
  const payload = (await request.json()) as SettingsUpdateRequest;
  const userId = payload.userId ?? DEFAULT_USER_SETTINGS.userId;

  const nextSettings = {
    userId,
    das: payload.das ?? DEFAULT_USER_SETTINGS.das,
    arr: payload.arr ?? DEFAULT_USER_SETTINGS.arr,
    sfxVolume: payload.sfxVolume ?? DEFAULT_USER_SETTINGS.sfxVolume,
    musicVolume: payload.musicVolume ?? DEFAULT_USER_SETTINGS.musicVolume,
    theme: payload.theme ?? DEFAULT_USER_SETTINGS.theme,
    ghostEnabled: payload.ghostEnabled ?? DEFAULT_USER_SETTINGS.ghostEnabled,
  };

  if (getDatabaseReadiness() !== "ready") {
    return NextResponse.json<SettingsResponse>({
      persisted: false,
      databaseReady: false,
      settings: nextSettings,
    });
  }

  try {
    const persisted = await upsertUserSettings(nextSettings);

    return NextResponse.json<SettingsResponse>({
      persisted: true,
      databaseReady: true,
      settings: {
        userId: persisted.userId,
        das: persisted.das,
        arr: persisted.arr,
        sfxVolume: persisted.sfxVolume,
        musicVolume: persisted.musicVolume,
        theme: persisted.theme,
        ghostEnabled: persisted.ghostEnabled,
      },
    });
  } catch {
    return NextResponse.json<SettingsResponse>({
      persisted: false,
      databaseReady: false,
      settings: nextSettings,
    });
  }
}
