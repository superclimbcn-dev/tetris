"use client";

import { type GameMode } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import { MobileControls } from "@/components/MobileControls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRotationMatrix, type TetrominoType } from "@/engine/types/tetromino";
import { useAudio } from "@/hooks/useAudio";
import { useGame } from "@/hooks/useGame";
import { useGuestIdentity } from "@/hooks/useGuestIdentity";
import { useSettings } from "@/hooks/useSettings";
import { GameCanvas } from "@/render/canvas/GameCanvas";
import { Hud } from "@/render/ui/hud";

type PiecePreviewProps = {
  readonly title: string;
  readonly type: TetrominoType | null;
};

type LeaderboardEntry = {
  readonly id: string;
  readonly userId: string;
  readonly score: number;
  readonly level: number;
  readonly lines: number;
  readonly mode: GameMode;
  readonly timestamp: string;
  readonly isPB: boolean;
  readonly user: {
    readonly id: string;
    readonly name: string | null;
    readonly image: string | null;
  };
};

type ScoresGetResponse = {
  readonly databaseReady: boolean;
  readonly scores: readonly LeaderboardEntry[];
};

type PersonalBestResponse = {
  readonly databaseReady: boolean;
  readonly personalBest: number;
};

type SaveScoreResponse = {
  readonly persisted: boolean;
  readonly databaseReady: boolean;
  readonly isNewPersonalBest: boolean;
  readonly personalBest: number;
};

const PLAY_MODE: GameMode = "CLASSIC";

function PiecePreview({ title, type }: PiecePreviewProps) {
  const matrix = type === null ? null : getRotationMatrix(type, 0);

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {matrix === null ? (
          <div className="grid h-24 place-items-center rounded-2xl border border-dashed border-border/60 text-sm text-muted-foreground">
            Empty
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1 rounded-2xl border border-border/60 bg-background/70 p-3">
            {matrix.flatMap((row, rowIndex) =>
              row.map((cell, cellIndex) => (
                <div
                  key={`${title}-${rowIndex}-${cellIndex}`}
                  className={
                    cell === 1
                      ? "aspect-square rounded-md bg-primary"
                      : "aspect-square rounded-md bg-muted/30"
                  }
                />
              )),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatPlayerName(entry: LeaderboardEntry): string {
  return entry.user.name ?? `Guest ${entry.userId.slice(-6).toUpperCase()}`;
}

export default function PlayPage() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<readonly LeaderboardEntry[]>([]);
  const [leaderboardReady, setLeaderboardReady] = useState(false);
  const [personalBest, setPersonalBest] = useState(0);
  const [saveMessage, setSaveMessage] = useState<string>("No score saved yet.");
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);
  const { guestId } = useGuestIdentity();
  const lastSavedGameOverAtRef = useRef<number | null>(null);
  const previousPhaseRef = useRef<string | null>(null);

  const {
    settings,
    input,
    audio,
    gameplay,
    databaseReady,
    updateInputSettings,
    updateAudioSettings,
    updateGameplaySettings,
  } = useSettings(guestId);
  const { snapshot, commands, setSurfaceElement } = useGame({
    dasMs: input.das,
    arrMs: input.arr,
  });
  const audioControls = useAudio({
    phase: snapshot.phase,
    recentEvent: snapshot.recentEvent,
    sfxVolume: audio.sfxVolume,
    musicVolume: audio.musicVolume,
  });

  const loadLeaderboard = async () => {
    const response = await fetch(`/api/scores?mode=${PLAY_MODE}&limit=10`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as ScoresGetResponse;
    setLeaderboardEntries(payload.scores);
    setLeaderboardReady(payload.databaseReady);
  };

  const loadPersonalBest = async () => {
    const response = await fetch(`/api/scores/pb?userId=${guestId}&mode=${PLAY_MODE}`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as PersonalBestResponse;
    setPersonalBest(payload.personalBest);
  };

  useEffect(() => {
    const coarsePointerMedia = window.matchMedia("(pointer: coarse)");

    const updateTouchState = () => {
      setIsTouchDevice("ontouchstart" in window || coarsePointerMedia.matches);
    };

    updateTouchState();
    coarsePointerMedia.addEventListener("change", updateTouchState);

    return () => {
      coarsePointerMedia.removeEventListener("change", updateTouchState);
    };
  }, []);

  useEffect(() => {
    if (guestId === "guest-pending") {
      return;
    }

    void loadLeaderboard();
    void loadPersonalBest();
  }, [guestId]);

  useEffect(() => {
    if (!isLeaderboardOpen) {
      return;
    }

    void loadLeaderboard();
  }, [isLeaderboardOpen]);

  useEffect(() => {
    const currentEvent = snapshot.recentEvent;

    if (
      guestId === "guest-pending" ||
      currentEvent === null ||
      currentEvent.kind !== "game-over" ||
      lastSavedGameOverAtRef.current === currentEvent.at
    ) {
      return;
    }

    lastSavedGameOverAtRef.current = currentEvent.at;

    const persistScore = async () => {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: guestId,
          mode: PLAY_MODE,
          score: snapshot.score.score,
          level: snapshot.score.level,
          lines: snapshot.score.linesCleared,
        }),
      });
      const payload = (await response.json()) as SaveScoreResponse;

      setIsNewPersonalBest(payload.isNewPersonalBest);
      setPersonalBest(payload.personalBest);
      setSaveMessage(
        payload.persisted
          ? payload.isNewPersonalBest
            ? "NEW PB! Score saved to leaderboard."
            : "Score saved to leaderboard."
          : "Database still unavailable. Score kept locally in this session.",
      );
      setIsLeaderboardOpen(true);
      await loadLeaderboard();
    };

    void persistScore();
  }, [
    guestId,
    snapshot.recentEvent,
    snapshot.score.level,
    snapshot.score.linesCleared,
    snapshot.score.score,
  ]);

  useEffect(() => {
    if (previousPhaseRef.current === "GAME_OVER" && snapshot.phase === "PLAYING") {
      setIsNewPersonalBest(false);
      setSaveMessage("No score saved yet.");
    }

    previousPhaseRef.current = snapshot.phase;
  }, [snapshot.phase]);

  return (
    <main
      className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 pb-32 md:px-6 md:pb-6"
      onPointerDownCapture={() => {
        void audioControls.prime();
      }}
      onTouchStartCapture={() => {
        void audioControls.prime();
      }}
    >
      <section className="mb-6 rounded-3xl border border-border/60 bg-card/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              Play Mode
            </p>
            <h1 className="text-3xl font-semibold md:text-5xl">
              First playable canvas build.
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
              Gravity, movement, rotation, hold, hard drop, ghost piece, line clear,
              scoreboard, guest persistence, and leaderboard APIs are now connected.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={commands.restart}>Restart</Button>
            <Button variant="outline" onClick={() => setIsLeaderboardOpen(true)}>
              Leaderboard
            </Button>
            <Button
              variant="outline"
              onClick={
                snapshot.phase === "PAUSED" ? commands.resume : commands.pause
              }
            >
              {snapshot.phase === "PAUSED" ? "Resume" : "Pause"}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
        <aside className="space-y-4">
          <Hud
            phase={snapshot.phase}
            score={snapshot.score.score}
            level={snapshot.score.level}
            lines={snapshot.score.linesCleared}
          />
          <PiecePreview title="Hold" type={snapshot.queue.hold} />
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Guest ID: {guestId === "guest-pending" ? "loading..." : guestId.slice(-12)}</p>
              <p>Personal best: {personalBest}</p>
              <p className={isNewPersonalBest ? "font-semibold text-primary" : ""}>{saveMessage}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Input Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>DAS</span>
                  <span>{settings.das} ms</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={300}
                  step={1}
                  value={settings.das}
                  onChange={(event) =>
                    updateInputSettings({ das: Number(event.target.value) })
                  }
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>ARR</span>
                  <span>{settings.arr} ms</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.arr}
                  onChange={(event) =>
                    updateInputSettings({ arr: Number(event.target.value) })
                  }
                  className="w-full"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Settings sync: {databaseReady ? "database path ready" : "local fallback"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Juice Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Ghost piece</span>
                <input
                  type="checkbox"
                  checked={gameplay.ghostEnabled}
                  onChange={(event) =>
                    updateGameplaySettings({ ghostEnabled: event.target.checked })
                  }
                  className="h-4 w-4"
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Audio enabled</span>
                <input
                  type="checkbox"
                  checked={audioControls.enabled}
                  onChange={(event) => audioControls.setEnabled(event.target.checked)}
                  className="h-4 w-4"
                />
              </label>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>SFX</span>
                  <span>{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.sfxVolume}
                  onChange={(event) =>
                    updateAudioSettings({ sfxVolume: Number(event.target.value) })
                  }
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Music</span>
                  <span>{Math.round(settings.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.musicVolume}
                  onChange={(event) =>
                    updateAudioSettings({ musicVolume: Number(event.target.value) })
                  }
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        </aside>

        <section
          ref={setSurfaceElement}
          className="flex flex-col items-center gap-4 touch-manipulation"
        >
          <GameCanvas snapshot={snapshot} ghostEnabled={gameplay.ghostEnabled} />
          <Card className="w-full border-border/60 bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Controls</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
              <p>Move: Arrow keys or A / D</p>
              <p>Rotate: Arrow Up, X, Z</p>
              <p>Soft drop: Arrow Down or S</p>
              <p>Hard drop: Space</p>
              <p>Hold: C</p>
              <p>Pause: Esc or P</p>
              <p>Touch: tap rotate, double-tap hard drop</p>
              <p>Touch: swipe left/right/down</p>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Next Queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {snapshot.queue.next.map((type, index) => (
                <PiecePreview key={`${type}-${index}`} title={`Next ${index + 1}`} type={type} />
              ))}
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Top 3</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {leaderboardEntries.slice(0, 3).map((entry, index) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-border/60 bg-background/70 p-3 text-sm"
                >
                  <p className="font-medium">
                    #{index + 1} {formatPlayerName(entry)}
                  </p>
                  <p className="text-muted-foreground">
                    {entry.score} pts • {entry.lines} lines • Lv {entry.level}
                  </p>
                </div>
              ))}
              {leaderboardEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No scores yet or database still offline.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </section>

      {isTouchDevice ? (
        <MobileControls
          onPrimeAudio={() => {
            void audioControls.prime();
          }}
          onMoveLeft={commands.moveLeft}
          onMoveRight={commands.moveRight}
          onRotate={commands.rotateClockwise}
          onHardDrop={commands.hardDrop}
          onHold={commands.hold}
        />
      ) : null}

      {isLeaderboardOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <Card className="max-h-[80vh] w-full max-w-2xl overflow-hidden border-border/60 bg-card/95">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Leaderboard</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {leaderboardReady ? "Top 10 Classic scores" : "Database not ready yet"}
                </p>
              </div>
              <Button variant="outline" onClick={() => setIsLeaderboardOpen(false)}>
                Close
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 overflow-y-auto">
              {leaderboardEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-border/60 bg-background/70 p-3"
                >
                  <div className="text-lg font-semibold text-primary">#{index + 1}</div>
                  <div>
                    <p className="font-medium">{formatPlayerName(entry)}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.lines} lines • Lv {entry.level}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{entry.score}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.isPB ? "PB" : "Score"}
                    </p>
                  </div>
                </div>
              ))}
              {leaderboardEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No scores available yet. As soon as Neon is writable here, this overlay
                  will populate automatically.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </main>
  );
}
