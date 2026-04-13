import type {
  ActivePiece,
  BoardCoordinate,
  BoardMatrix,
  CellState,
} from "@/engine/types/board";
import { BOARD_HEIGHT, BOARD_WIDTH, getCell, isWithinBoard } from "@/engine/types/board";
import { getOccupiedCells } from "@/engine/types/tetromino";

export type BoundingBox = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
};

export type CollisionResult = {
  readonly collides: boolean;
  readonly outOfBounds: boolean;
  readonly hitsStack: boolean;
};

export function isInsideBoard(x: number, y: number): boolean {
  return x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_HEIGHT;
}

export function isOutOfBounds(coordinate: BoardCoordinate): boolean {
  return !isWithinBoard(coordinate);
}

export function isOccupiedCell(cell: CellState | null): boolean {
  return cell?.kind === "occupied";
}

export function getPieceCoordinates(piece: ActivePiece): readonly BoardCoordinate[] {
  return getOccupiedCells(piece.type, piece.rotation).map((cell) => ({
    x: piece.position.x + cell.x,
    y: piece.position.y + cell.y,
  }));
}

export function getPieceBoundingBox(piece: ActivePiece): BoundingBox {
  const coordinates = getPieceCoordinates(piece);
  const xValues = coordinates.map((coordinate) => coordinate.x);
  const yValues = coordinates.map((coordinate) => coordinate.y);

  return {
    left: Math.min(...xValues),
    right: Math.max(...xValues),
    top: Math.min(...yValues),
    bottom: Math.max(...yValues),
  };
}

export function boxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

export function collidesWithBoundaries(piece: ActivePiece): boolean {
  return getPieceCoordinates(piece).some((coordinate) => isOutOfBounds(coordinate));
}

export function collidesWithStack(
  board: BoardMatrix,
  piece: ActivePiece,
): boolean {
  return getPieceCoordinates(piece).some((coordinate) =>
    isOccupiedCell(getCell(board, coordinate)),
  );
}

export function detectCollision(
  board: BoardMatrix,
  piece: ActivePiece,
): CollisionResult {
  const outOfBounds = collidesWithBoundaries(piece);
  const hitsStack = !outOfBounds && collidesWithStack(board, piece);

  return {
    collides: outOfBounds || hitsStack,
    outOfBounds,
    hitsStack,
  };
}

export function canPlacePiece(board: BoardMatrix, piece: ActivePiece): boolean {
  return !detectCollision(board, piece).collides;
}

export function translatePiece(
  piece: ActivePiece,
  offset: BoardCoordinate,
): ActivePiece {
  return {
    ...piece,
    position: {
      x: piece.position.x + offset.x,
      y: piece.position.y + offset.y,
    },
  };
}
