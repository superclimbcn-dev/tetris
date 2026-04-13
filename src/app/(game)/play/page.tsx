"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRotationMatrix, type TetrominoType } from "@/engine/types/tetromino";
import { useAudio } from "@/hooks/useAudio";
import { useGame } from "@/hooks/useGame";
import { useSettings } from "@/hooks/useSettings";
import { GameCanvas } from "@/render/canvas/GameCanvas";
import { Hud } from "@/render/ui/hud";

type PiecePreviewProps = {
  readonly title: string;
  readonly type: TetrominoType | null;
};

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

export default function PlayPage() {
  const {
    settings,
    input,
    audio,
    gameplay,
    databaseReady,
    updateInputSettings,
    updateAudioSettings,
    updateGameplaySettings,
  } = useSettings();
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 md:px-6">
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
              and scoreboard are now connected to the typed engine.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={commands.restart}>Restart</Button>
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
        </aside>
      </section>
    </main>
  );
}
