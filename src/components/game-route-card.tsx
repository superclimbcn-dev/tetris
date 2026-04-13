import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GameRouteCardProps = {
  mode: string;
  description: string;
};

export function GameRouteCard({ mode, description }: GameRouteCardProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-10">
      <Card className="w-full border-border/60 bg-card/70 backdrop-blur">
        <CardHeader>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">
            Game Route
          </p>
          <CardTitle className="text-4xl">{mode}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            {description}
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/">Back home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/play">Open main route</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
