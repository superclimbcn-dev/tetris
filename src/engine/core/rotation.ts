import { canPlacePiece, translatePiece } from "@/engine/core/collision";
import type { ActivePiece, BoardMatrix } from "@/engine/types/board";
import {
  getKickTable,
  getRotationTransitionKey,
  type RotationDirection,
  type RotationIndex,
} from "@/engine/types/tetromino";

export type RotationAttempt = {
  readonly success: boolean;
  readonly piece: ActivePiece;
  readonly appliedKick: { readonly x: number; readonly y: number } | null;
};

export function rotateClockwise(rotation: RotationIndex): RotationIndex {
  return ((rotation + 1) % 4) as RotationIndex;
}

export function rotateCounterClockwise(rotation: RotationIndex): RotationIndex {
  return ((rotation + 3) % 4) as RotationIndex;
}

export function getNextRotation(
  rotation: RotationIndex,
  direction: RotationDirection,
): RotationIndex {
  return direction === "CW"
    ? rotateClockwise(rotation)
    : rotateCounterClockwise(rotation);
}

export function rotatePiece(
  piece: ActivePiece,
  direction: RotationDirection,
): ActivePiece {
  return {
    ...piece,
    rotation: getNextRotation(piece.rotation, direction),
  };
}

export function tryRotatePiece(
  board: BoardMatrix,
  piece: ActivePiece,
  direction: RotationDirection,
): RotationAttempt {
  const rotatedPiece = rotatePiece(piece, direction);
  const transitionKey = getRotationTransitionKey(piece.rotation, rotatedPiece.rotation);
  const kickTable = getKickTable(piece.type);
  const kicks = kickTable[transitionKey];

  for (const kick of kicks) {
    const kickedPiece = translatePiece(rotatedPiece, kick);

    if (canPlacePiece(board, kickedPiece)) {
      return {
        success: true,
        piece: kickedPiece,
        appliedKick: kick,
      };
    }
  }

  return {
    success: false,
    piece,
    appliedKick: null,
  };
}
