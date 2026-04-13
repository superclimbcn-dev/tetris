"use client";

import { useEffect, useRef, useState } from "react";
import { type ThemeName, isThemeName } from "@/themes";

export type InputSettings = {
  readonly das: number;
  readonly arr: number;
};

export type AudioSettings = {
  readonly sfxVolume: number;
  readonly musicVolume: number;
};

export type GameplaySettings = {
  readonly ghostEnabled: boolean;
  readonly theme: ThemeName;
};

export type UserSettingsSnapshot = {
  readonly userId: string;
  readonly das: number;
  readonly arr: number;
  readonly sfxVolume: number;
  readonly musicVolume: number;
  readonly theme: string;
  readonly ghostEnabled: boolean;
};

type SettingsApiResponse = {
  readonly persisted: boolean;
  readonly databaseReady: boolean;
  readonly settings: UserSettingsSnapshot;
};

const STORAGE_KEY = "tetris-nexus-settings";

export const DEFAULT_SETTINGS: UserSettingsSnapshot = {
  userId: "local-player",
  das: 167,
  arr: 33,
  sfxVolume: 0.7,
  musicVolume: 0.5,
  theme: "neon",
  ghostEnabled: true,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toInputSettings(settings: UserSettingsSnapshot): InputSettings {
  return {
    das: settings.das,
    arr: settings.arr,
  };
}

function toAudioSettings(settings: UserSettingsSnapshot): AudioSettings {
  return {
    sfxVolume: settings.sfxVolume,
    musicVolume: settings.musicVolume,
  };
}

function toGameplaySettings(settings: UserSettingsSnapshot): GameplaySettings {
  return {
    ghostEnabled: settings.ghostEnabled,
    theme: isThemeName(settings.theme) ? settings.theme : "neon",
  };
}

export function useSettings(userId: string) {
  const [settings, setSettings] = useState<UserSettingsSnapshot>(DEFAULT_SETTINGS);
  const [databaseReady, setDatabaseReady] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored !== null) {
      try {
        const parsed = JSON.parse(stored) as UserSettingsSnapshot;
        setSettings({
          ...parsed,
          userId,
        });
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    const loadSettings = async () => {
      try {
        const response = await fetch(`/api/settings?userId=${userId}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as SettingsApiResponse;
        setDatabaseReady(payload.databaseReady);
        const nextSettings = {
          ...payload.settings,
          userId,
        };
        setSettings(nextSettings);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
      } catch {
        setDatabaseReady(false);
        setSettings((current) => ({
          ...current,
          userId,
        }));
      } finally {
        hasLoadedRef.current = true;
      }
    };

    void loadSettings();
  }, [userId]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      const persist = async () => {
        try {
          const response = await fetch("/api/settings", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(settings),
          });
          const payload = (await response.json()) as SettingsApiResponse;
          setDatabaseReady(payload.databaseReady);
        } catch {
          setDatabaseReady(false);
        }
      };

      void persist();
    }, 250);

    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [settings]);

  return {
    settings,
    input: toInputSettings(settings),
    audio: toAudioSettings(settings),
    gameplay: toGameplaySettings(settings),
    databaseReady,
    updateInputSettings: (next: Partial<InputSettings>) => {
      setSettings((current) => ({
        ...current,
        userId,
        das: clamp(next.das ?? current.das, 50, 300),
        arr: clamp(next.arr ?? current.arr, 0, 100),
      }));
    },
    updateAudioSettings: (next: Partial<AudioSettings>) => {
      setSettings((current) => ({
        ...current,
        userId,
        sfxVolume: clamp(next.sfxVolume ?? current.sfxVolume, 0, 1),
        musicVolume: clamp(next.musicVolume ?? current.musicVolume, 0, 1),
      }));
    },
    updateGameplaySettings: (next: Partial<GameplaySettings>) => {
      setSettings((current) => ({
        ...current,
        userId,
        ghostEnabled: next.ghostEnabled ?? current.ghostEnabled,
        theme: next.theme ?? current.theme,
      }));
    },
  };
}
