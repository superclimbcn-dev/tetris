import Link from "next/link";
import { ArrowRight, Smartphone, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const pillars = [
  {
    icon: Trophy,
    title: "Typed Engine",
    description: "Pure engine modules for SRS, collision, scoring, and state transitions.",
  },
  {
    icon: Smartphone,
    title: "PWA First",
    description: "Designed for installability, mobile touch controls, and offline-friendly play.",
  },
  {
    icon: Sparkles,
    title: "Incremental Build",
    description: "Stable foundation first, then gameplay, effects, persistence, and polish.",
  },
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8">
      <section className="rounded-3xl border border-border/60 bg-card/70 p-8 shadow-2xl shadow-black/20 backdrop-blur md:p-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-5">
            <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Tetris Nexus
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-6xl">
                Next.js foundation aligned for a serious Tetris build.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                The project now targets a src-based App Router structure, Tailwind,
                shadcn/ui primitives, and a clean runway for the typed engine.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/play">
                Open play route
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/sprint">See sprint mode</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {pillars.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <CardTitle className="pt-4">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle>Phase 1A status</CardTitle>
            <CardDescription>
              Base structure, styling stack, and app routes are ready for the next step.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="font-medium text-foreground">Ready now</p>
              <p className="mt-2">
                src-based routing, Tailwind integration, shadcn/ui utility layer, and
                placeholder modules for engine, render, input, audio, hooks, and db.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="font-medium text-foreground">Next step</p>
              <p className="mt-2">
                Prisma/Neon stabilization plus the initial schema before we implement
                the engine core and board state.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle>Mode routes</CardTitle>
            <CardDescription>Initial route shells are already wired.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Button asChild variant="ghost" className="justify-start">
              <Link href="/play">/play</Link>
            </Button>
            <Button asChild variant="ghost" className="justify-start">
              <Link href="/zen">/zen</Link>
            </Button>
            <Button asChild variant="ghost" className="justify-start">
              <Link href="/sprint">/sprint</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
