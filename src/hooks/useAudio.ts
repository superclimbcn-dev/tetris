"use client";

import { useEffect, useRef, useState } from "react";
import type { GameFeedbackEvent, GameFeedbackEventKind } from "@/hooks/useGame";
import type { GamePhase } from "@/engine/types/game";
import { DEFAULT_ENVELOPE, type EnvelopeSettings } from "@/audio/synth/envelope";

type AudioInput = {
  readonly phase: GamePhase;
  readonly recentEvent: GameFeedbackEvent | null;
  readonly sfxVolume: number;
  readonly musicVolume: number;
};

type UseAudioResult = {
  readonly enabled: boolean;
  readonly setEnabled: (enabled: boolean) => void;
};

type ToneOptions = {
  readonly frequency: number;
  readonly durationMs: number;
  readonly volume: number;
  readonly type: OscillatorType;
  readonly envelope?: EnvelopeSettings;
  readonly detune?: number;
};

const DEFAULT_MUSIC_PATTERN = [220, 261.63, 329.63, 392] as const;
const ZONE_MUSIC_PATTERN = [261.63, 329.63, 392, 523.25] as const;

function createContext(): AudioContext | null {
  const AudioContextConstructor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return AudioContextConstructor === undefined ? null : new AudioContextConstructor();
}

function playTone(context: AudioContext, options: ToneOptions) {
  const now = context.currentTime;
  const durationSeconds = options.durationMs / 1000;
  const envelope = options.envelope ?? DEFAULT_ENVELOPE;
  const masterGain = context.createGain();
  const oscillator = context.createOscillator();

  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.linearRampToValueAtTime(options.volume, now + envelope.attack);
  masterGain.gain.linearRampToValueAtTime(
    options.volume * envelope.sustain,
    now + envelope.attack + envelope.decay,
  );
  masterGain.gain.linearRampToValueAtTime(
    0.0001,
    now + durationSeconds + envelope.release,
  );

  oscillator.type = options.type;
  oscillator.frequency.setValueAtTime(options.frequency, now);

  if (options.detune !== undefined) {
    oscillator.detune.setValueAtTime(options.detune, now);
  }

  oscillator.connect(masterGain);
  masterGain.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + durationSeconds + envelope.release + 0.02);
}

function playChord(context: AudioContext, notes: readonly number[], volume: number) {
  notes.forEach((frequency, index) => {
    playTone(context, {
      frequency,
      durationMs: 220 + index * 40,
      volume,
      type: "triangle",
      detune: index === 0 ? -3 : index === 2 ? 4 : 0,
    });
  });
}

function playEventSound(
  context: AudioContext,
  eventKind: GameFeedbackEventKind,
  sfxVolume: number,
) {
  const scaledVolume = Math.max(0, Math.min(1, sfxVolume));

  if (scaledVolume === 0) {
    return;
  }

  switch (eventKind) {
    case "move":
      playTone(context, {
        frequency: 440,
        durationMs: 40,
        volume: scaledVolume * 0.12,
        type: "square",
        envelope: {
          attack: 0.002,
          decay: 0.02,
          sustain: 0.2,
          release: 0.03,
        },
      });
      return;
    case "rotate":
      playTone(context, {
        frequency: 620,
        durationMs: 90,
        volume: scaledVolume * 0.18,
        type: "triangle",
        detune: 12,
      });
      return;
    case "hold":
      playTone(context, {
        frequency: 330,
        durationMs: 110,
        volume: scaledVolume * 0.16,
        type: "sine",
      });
      return;
    case "hard-drop":
      playTone(context, {
        frequency: 180,
        durationMs: 80,
        volume: scaledVolume * 0.22,
        type: "sawtooth",
      });
      return;
    case "lock":
      playTone(context, {
        frequency: 120,
        durationMs: 140,
        volume: scaledVolume * 0.26,
        type: "triangle",
      });
      return;
    case "clear":
      playChord(context, [392, 523.25, 659.25], scaledVolume * 0.18);
      return;
    case "pause":
      playTone(context, {
        frequency: 220,
        durationMs: 120,
        volume: scaledVolume * 0.1,
        type: "sine",
      });
      return;
    case "resume":
      playTone(context, {
        frequency: 293.66,
        durationMs: 120,
        volume: scaledVolume * 0.1,
        type: "sine",
      });
      return;
    case "game-over":
      playChord(context, [196, 164.81, 130.81], scaledVolume * 0.18);
      return;
  }
}

function getPatternForPhase(phase: GamePhase): readonly number[] {
  return phase === "ZONE_ACTIVE" ? ZONE_MUSIC_PATTERN : DEFAULT_MUSIC_PATTERN;
}

function getTempoForPhase(phase: GamePhase): number {
  return phase === "ZONE_ACTIVE" ? 220 : 340;
}

export function useAudio(input: AudioInput): UseAudioResult {
  const [enabled, setEnabled] = useState(true);
  const contextRef = useRef<AudioContext | null>(null);
  const lastEventAtRef = useRef<number | null>(null);
  const stepIndexRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const unlock = async () => {
      const context = contextRef.current ?? createContext();
      contextRef.current = context;

      if (context !== null && context.state !== "running") {
        await context.resume();
      }
    };

    const handleUnlock = () => {
      void unlock();
    };

    window.addEventListener("pointerdown", handleUnlock, { once: true });
    window.addEventListener("keydown", handleUnlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handleUnlock);
      window.removeEventListener("keydown", handleUnlock);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || input.recentEvent === null) {
      return;
    }

    if (lastEventAtRef.current === input.recentEvent.at) {
      return;
    }

    lastEventAtRef.current = input.recentEvent.at;

    const context = contextRef.current;

    if (context === null || context.state !== "running") {
      return;
    }

    playEventSound(context, input.recentEvent.kind, input.sfxVolume);
  }, [enabled, input.recentEvent, input.sfxVolume]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (input.phase !== "PLAYING" && input.phase !== "ZONE_ACTIVE") {
      return;
    }

    const interval = window.setInterval(() => {
      const context = contextRef.current;

      if (context === null || context.state !== "running" || input.musicVolume <= 0) {
        return;
      }

      const pattern = getPatternForPhase(input.phase);
      const note = pattern[stepIndexRef.current % pattern.length];
      stepIndexRef.current += 1;

      playTone(context, {
        frequency: note,
        durationMs: Math.max(120, getTempoForPhase(input.phase) - 80),
        volume: input.musicVolume * 0.08,
        type: input.phase === "ZONE_ACTIVE" ? "sawtooth" : "triangle",
        envelope: {
          attack: 0.01,
          decay: 0.06,
          sustain: 0.45,
          release: 0.1,
        },
      });
    }, getTempoForPhase(input.phase));

    return () => {
      window.clearInterval(interval);
    };
  }, [enabled, input.musicVolume, input.phase]);

  return {
    enabled,
    setEnabled,
  };
}
