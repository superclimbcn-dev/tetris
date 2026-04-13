"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Settings, Trophy } from "lucide-react";
import { getGameModeConfig } from "@/components/GameModeConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GameMode } from "@/engine/types/game";
import { themes } from "@/themes";

type LeaderboardEntry = {
  readonly id: string;
  readonly score: number;
  readonly lines: number;
  readonly level: number;
  readonly mode: GameMode;
  readonly user: {
    readonly name: string | null;
  };
};

type ScoresGetResponse = {
  readonly databaseReady: boolean;
  readonly scores: readonly LeaderboardEntry[];
};

const modeCards: readonly { mode: GameMode; href: string; kicker: string }[] = [
  { mode: "CLASSIC", href: "/play", kicker: "Guideline" },
  { mode: "ZEN", href: "/zen", kicker: "Infinite flow" },
  { mode: "SPRINT", href: "/sprint", kicker: "40 lines" },
  { mode: "BLITZ", href: "/blitz", kicker: "2:00 attack" },
];

function formatMetric(mode: GameMode, score: number): string {
  if (mode === "SPRINT") {
    const totalSeconds = Math.floor(score / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((score % 1000) / 10);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${hundredths.toString().padStart(2, "0")}`;
  }

  return score.toLocaleString();
}

export default function HomePage() {
  const [globalBoard, setGlobalBoard] = useState<readonly LeaderboardEntry[]>([]);

  useEffect(() => {
    const loadBoards = async () => {
      const boards = await Promise.all(
        modeCards
          .filter((item) => item.mode !== "ZEN")
          .map(async (item) => {
            const response = await fetch(`/api/scores?mode=${item.mode}&limit=3`, {
              cache: "no-store",
            });
            const payload = (await response.json()) as ScoresGetResponse;
            return payload.scores;
          }),
      );

      setGlobalBoard(
        boards
          .flat()
          .sort((left, right) => {
            if (left.mode === "SPRINT" && right.mode === "SPRINT") {
              return left.score - right.score;
            }

            return right.score - left.score;
          })
          .slice(0, 10),
      );
    };

    void loadBoards();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 p-8 shadow-2xl shadow-black/20 backdrop-blur md:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.2),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.16),transparent_32%)]" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-5">
            <span className="inline-flex animate-pulse rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Tetris Nexus
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-6xl">
                Four modes, five themes, one installable arcade.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Jump into Classic, unwind in Zen, race Sprint, or squeeze every point out
                of Blitz. Your settings, themes, PBs, and leaderboards now travel with you.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/play">
                Start Classic
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/zen">Relax in Zen</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {modeCards.map(({ mode, href, kicker }) => {
          const config = getGameModeConfig(mode);

          return (
            <Card key={mode} className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                  {kicker}
                </span>
                <CardTitle className="text-2xl">{config.title}</CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">{config.description}</p>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full justify-between">
                  <Link href={href}>
                    Open {config.title}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Themes
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {Object.entries(themes).map(([key, theme]) => (
              <div
                key={key}
                className="rounded-2xl border border-border/60 p-4"
                style={{
                  background: `linear-gradient(180deg, ${theme.backgroundTop}, ${theme.backgroundBottom})`,
                }}
              >
                <p className="font-medium text-white">{theme.name}</p>
                <div className="mt-3 flex gap-2">
                  <span
                    className="h-4 w-4 rounded-full border border-white/20"
                    style={{ backgroundColor: theme.board }}
                  />
                  <span
                    className="h-4 w-4 rounded-full border border-white/20"
                    style={{ backgroundColor: theme.accent }}
                  />
                  <span
                    className="h-4 w-4 rounded-full border border-white/20"
                    style={{ backgroundColor: theme.backgroundBottom }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Global Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {globalBoard.length === 0 ? (
              Array.from({ length: 5 }, (_, index) => (
                <div
                  key={`global-skeleton-${index}`}
                  className="h-16 animate-pulse rounded-2xl border border-border/60 bg-background/50"
                />
              ))
            ) : (
              globalBoard.map((entry, index) => (
                <div
                  key={`${entry.mode}-${entry.id}`}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-border/60 bg-background/70 p-3"
                >
                  <div className="text-lg font-semibold text-primary">#{index + 1}</div>
                  <div>
                    <p className="font-medium">{entry.user.name ?? "Guest"}</p>
                    <p className="text-sm text-muted-foreground">{entry.mode}</p>
                  </div>
                  <div className="text-right font-semibold">
                    {formatMetric(entry.mode, entry.score)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
