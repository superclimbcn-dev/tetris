"use client";

import { useEffect, useRef } from "react";
import { getPieceCoordinates } from "@/engine/core/collision";
import type { BoardRow, CellState } from "@/engine/types/board";
import { DEFAULT_SHAKE } from "@/render/effects/screen-shake";
import type { GameFeedbackEvent, GameSnapshot } from "@/hooks/useGame";

type GameCanvasProps = {
  readonly snapshot: GameSnapshot;
  readonly ghostEnabled?: boolean;
};

type Particle = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  size: number;
  lifeMs: number;
  maxLifeMs: number;
  color: string;
};

type ShakeState = {
  amplitude: number;
  remainingMs: number;
};

const CELL_SIZE = 28;
const BOARD_PADDING = 16;
const BOARD_PIXEL_WIDTH = 10 * CELL_SIZE;
const BOARD_PIXEL_HEIGHT = 20 * CELL_SIZE;
const CENTER_X = BOARD_PADDING + BOARD_PIXEL_WIDTH / 2;
const CENTER_Y = BOARD_PADDING + BOARD_PIXEL_HEIGHT / 2;

const TETROMINO_COLORS = {
  I: "#38bdf8",
  J: "#3b82f6",
  L: "#f97316",
  O: "#facc15",
  S: "#4ade80",
  T: "#a855f7",
  Z: "#ef4444",
} as const;

function createParticlesForClear(event: GameFeedbackEvent): Particle[] {
  if (event.kind !== "clear") {
    return [];
  }

  return event.clearedRows.flatMap((rowIndex) =>
    Array.from({ length: 16 }, (_, index) => {
      const column = index % 8;
      const lane = Math.floor(index / 8);
      const x = BOARD_PADDING + (column + 1.2) * (BOARD_PIXEL_WIDTH / 10);
      const y = BOARD_PADDING + rowIndex * CELL_SIZE + lane * 8 + 6;

      return {
        x,
        y,
        velocityX: (column - 3.5) * 0.26,
        velocityY: -0.8 - lane * 0.28,
        size: 4 + (index % 3),
        lifeMs: 420,
        maxLifeMs: 420,
        color: "rgba(248, 113, 113, 0.95)",
      };
    }),
  );
}

function shouldShake(event: GameFeedbackEvent): boolean {
  return event.kind === "lock" || event.kind === "hard-drop" || event.kind === "clear";
}

export function GameCanvas({
  snapshot,
  ghostEnabled = true,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshotRef = useRef(snapshot);
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef<ShakeState>({
    amplitude: 0,
    remainingMs: 0,
  });
  const handledEventAtRef = useRef<number | null>(null);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    if (snapshot.recentEvent === null) {
      return;
    }

    if (handledEventAtRef.current === snapshot.recentEvent.at) {
      return;
    }

    handledEventAtRef.current = snapshot.recentEvent.at;

    if (snapshot.recentEvent.kind === "clear") {
      particlesRef.current = [
        ...particlesRef.current,
        ...createParticlesForClear(snapshot.recentEvent),
      ];
    }

    if (shouldShake(snapshot.recentEvent)) {
      shakeRef.current = {
        amplitude: DEFAULT_SHAKE.amplitude,
        remainingMs: DEFAULT_SHAKE.durationMs,
      };
    }
  }, [snapshot.recentEvent]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas === null) {
      return;
    }

    const context = canvas.getContext("2d");

    if (context === null) {
      return;
    }

    let frameId = 0;
    let lastTimestamp = 0;

    const drawCell = (
      x: number,
      y: number,
      color: string,
      alpha = 1,
      glow = false,
    ) => {
      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.strokeStyle = "rgba(255,255,255,0.08)";
      context.lineWidth = 1;

      if (glow) {
        context.shadowBlur = 20;
        context.shadowColor = color;
      }

      context.beginPath();
      context.roundRect(
        BOARD_PADDING + x * CELL_SIZE + 1,
        BOARD_PADDING + y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2,
        7,
      );
      context.fill();
      context.stroke();

      context.fillStyle = "rgba(255,255,255,0.12)";
      context.beginPath();
      context.roundRect(
        BOARD_PADDING + x * CELL_SIZE + 5,
        BOARD_PADDING + y * CELL_SIZE + 4,
        CELL_SIZE - 10,
        6,
        4,
      );
      context.fill();
      context.restore();
    };

    const render = (timestamp: number) => {
      const current = snapshotRef.current;
      const deltaMs = lastTimestamp === 0 ? 16 : timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      context.clearRect(0, 0, canvas.width, canvas.height);

      const shake = shakeRef.current;
      const shakeRatio = shake.remainingMs > 0 ? shake.remainingMs / DEFAULT_SHAKE.durationMs : 0;
      const shakeOffsetX =
        shake.remainingMs > 0
          ? Math.sin(timestamp * 0.065) * shake.amplitude * shakeRatio
          : 0;
      const shakeOffsetY =
        shake.remainingMs > 0
          ? Math.cos(timestamp * 0.085) * shake.amplitude * shakeRatio
          : 0;

      if (shake.remainingMs > 0) {
        shake.remainingMs = Math.max(0, shake.remainingMs - deltaMs);
      }

      context.save();
      context.translate(shakeOffsetX, shakeOffsetY);

      const background = context.createLinearGradient(0, 0, 0, canvas.height);
      background.addColorStop(0, "#020617");
      background.addColorStop(1, "#0f172a");
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);

      const boardGlow = context.createRadialGradient(CENTER_X, CENTER_Y, 40, CENTER_X, CENTER_Y, 380);
      boardGlow.addColorStop(0, "rgba(239,68,68,0.14)");
      boardGlow.addColorStop(0.5, "rgba(56,189,248,0.08)");
      boardGlow.addColorStop(1, "rgba(15,23,42,0)");
      context.fillStyle = boardGlow;
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.fillStyle = "#081121";
      context.fillRect(
        BOARD_PADDING,
        BOARD_PADDING,
        BOARD_PIXEL_WIDTH,
        BOARD_PIXEL_HEIGHT,
      );

      context.strokeStyle = "rgba(148,163,184,0.12)";
      context.lineWidth = 1;

      for (let column = 0; column <= 10; column += 1) {
        const x = BOARD_PADDING + column * CELL_SIZE;
        context.beginPath();
        context.moveTo(x, BOARD_PADDING);
        context.lineTo(x, BOARD_PADDING + BOARD_PIXEL_HEIGHT);
        context.stroke();
      }

      for (let row = 0; row <= 20; row += 1) {
        const y = BOARD_PADDING + row * CELL_SIZE;
        context.beginPath();
        context.moveTo(BOARD_PADDING, y);
        context.lineTo(BOARD_PADDING + BOARD_PIXEL_WIDTH, y);
        context.stroke();
      }

      current.board.forEach((row: BoardRow, rowIndex: number) => {
        row.forEach((cell: CellState, columnIndex: number) => {
          if (cell.kind === "occupied") {
            drawCell(columnIndex, rowIndex, TETROMINO_COLORS[cell.tetromino]);
          }
        });
      });

      if (ghostEnabled && current.ghostPiece !== null) {
        const ghostCoordinates = getPieceCoordinates(current.ghostPiece);
        const ghostColor = TETROMINO_COLORS[current.ghostPiece.type];

        ghostCoordinates.forEach((coordinate) => {
          drawCell(coordinate.x, coordinate.y, ghostColor, 0.3);
        });
      }

      if (current.activePiece !== null) {
        const activeCoordinates = getPieceCoordinates(current.activePiece);
        const activeColor = TETROMINO_COLORS[current.activePiece.type];

        activeCoordinates.forEach((coordinate) => {
          drawCell(coordinate.x, coordinate.y, activeColor, 1, true);
        });
      }

      particlesRef.current = particlesRef.current
        .map((particle) => ({
          ...particle,
          x: particle.x + particle.velocityX * deltaMs,
          y: particle.y + particle.velocityY * deltaMs,
          velocityY: particle.velocityY + 0.0025 * deltaMs,
          lifeMs: particle.lifeMs - deltaMs,
        }))
        .filter((particle) => particle.lifeMs > 0);

      particlesRef.current.forEach((particle) => {
        const alpha = particle.lifeMs / particle.maxLifeMs;
        context.save();
        context.globalAlpha = alpha;
        context.fillStyle = particle.color;
        context.shadowBlur = 14;
        context.shadowColor = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
        context.restore();
      });

      if (current.phase === "PAUSED" || current.phase === "GAME_OVER") {
        context.fillStyle = "rgba(2,6,23,0.72)";
        context.fillRect(
          BOARD_PADDING,
          BOARD_PADDING,
          BOARD_PIXEL_WIDTH,
          BOARD_PIXEL_HEIGHT,
        );
        context.textAlign = "center";
        context.fillStyle = "#f8fafc";
        context.font = "700 28px Segoe UI";
        context.fillText(
          current.phase === "PAUSED" ? "Paused" : "Game Over",
          BOARD_PADDING + BOARD_PIXEL_WIDTH / 2,
          BOARD_PADDING + BOARD_PIXEL_HEIGHT / 2,
        );
      }

      context.restore();
      frameId = window.requestAnimationFrame(render);
    };

    frameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [ghostEnabled]);

  return (
    <canvas
      ref={canvasRef}
      width={BOARD_PIXEL_WIDTH + BOARD_PADDING * 2}
      height={BOARD_PIXEL_HEIGHT + BOARD_PADDING * 2}
      aria-label="Tetris game board"
      className="aspect-[10/20] w-full max-w-[22rem] rounded-[28px] border border-border/60 bg-black/30 shadow-[0_20px_80px_rgba(15,23,42,0.55)]"
    />
  );
}
