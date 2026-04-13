"use client";

import { useEffect, useRef } from "react";
import { getPieceCoordinates } from "@/engine/core/collision";
import type { BoardRow, CellState } from "@/engine/types/board";
import type { GameSnapshot } from "@/hooks/useGame";

type GameCanvasProps = {
  readonly snapshot: GameSnapshot;
};

const CELL_SIZE = 28;
const BOARD_PADDING = 16;
const BOARD_PIXEL_WIDTH = 10 * CELL_SIZE;
const BOARD_PIXEL_HEIGHT = 20 * CELL_SIZE;

const TETROMINO_COLORS = {
  I: "#38bdf8",
  J: "#3b82f6",
  L: "#f97316",
  O: "#facc15",
  S: "#4ade80",
  T: "#a855f7",
  Z: "#ef4444",
} as const;

export function GameCanvas({ snapshot }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

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

    const drawCell = (
      x: number,
      y: number,
      color: string,
      alpha = 1,
    ) => {
      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.strokeStyle = "rgba(255,255,255,0.08)";
      context.lineWidth = 1;
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
      context.restore();
    };

    const render = () => {
      const current = snapshotRef.current;

      context.clearRect(0, 0, canvas.width, canvas.height);

      context.fillStyle = "#050816";
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.fillStyle = "#0f172a";
      context.fillRect(
        BOARD_PADDING,
        BOARD_PADDING,
        BOARD_PIXEL_WIDTH,
        BOARD_PIXEL_HEIGHT,
      );

      context.strokeStyle = "rgba(148,163,184,0.18)";
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

      if (current.ghostPiece !== null) {
        const ghostCoordinates = getPieceCoordinates(current.ghostPiece);
        const ghostColor = TETROMINO_COLORS[current.ghostPiece.type];

        ghostCoordinates.forEach((coordinate) => {
          drawCell(
            coordinate.x,
            coordinate.y,
            ghostColor,
            0.25,
          );
        });
      }

      if (current.activePiece !== null) {
        const activeCoordinates = getPieceCoordinates(current.activePiece);
        const activeColor = TETROMINO_COLORS[current.activePiece.type];

        activeCoordinates.forEach((coordinate) => {
          drawCell(coordinate.x, coordinate.y, activeColor);
        });
      }

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

      frameId = window.requestAnimationFrame(render);
    };

    frameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={BOARD_PIXEL_WIDTH + BOARD_PADDING * 2}
      height={BOARD_PIXEL_HEIGHT + BOARD_PADDING * 2}
      aria-label="Tetris game board"
      className="aspect-[10/20] w-full max-w-[22rem] rounded-[28px] border border-border/60 bg-black/30 shadow-2xl shadow-black/30"
    />
  );
}
