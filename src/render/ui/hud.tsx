type HudProps = {
  readonly phase: string;
  readonly score: number;
  readonly level: number;
  readonly lines: number;
};

export function Hud({ phase, score, level, lines }: HudProps) {
  return (
    <div className="grid gap-3 text-sm">
      <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Phase</p>
        <p className="mt-2 text-2xl font-semibold">{phase}</p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Score</p>
        <p className="mt-2 text-2xl font-semibold">{score}</p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Level</p>
        <p className="mt-2 text-2xl font-semibold">{level}</p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Lines</p>
        <p className="mt-2 text-2xl font-semibold">{lines}</p>
      </div>
    </div>
  );
}
