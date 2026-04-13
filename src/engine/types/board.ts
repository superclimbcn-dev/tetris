import type { RotationIndex, TetrominoType } from "@/engine/types/tetromino";
import { getOccupiedCells } from "@/engine/types/tetromino";

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export type BoardCoordinate = {
  readonly x: number;
  readonly y: number;
};

export type EmptyCell = {
  readonly kind: "empty";
};

export type OccupiedCell = {
  readonly kind: "occupied";
  readonly tetromino: TetrominoType;
};

export type CellState = EmptyCell | OccupiedCell;

export type MutableBoardRow = [
  CellState,
  CellState,
  CellState,
  CellState,
  CellState,
  CellState,
  CellState,
  CellState,
  CellState,
  CellState,
];

export type BoardRow = readonly [...MutableBoardRow];

export type MutableBoardMatrix = [
  MutableBoardRow,
  MutableBoardRow,
  MutableBoardRow,
  MutableBoardRow,
  MutableBoardRow,
  MutableBoardRow,
  MutableBoardRow,
  MutableBoardRow,
  MutableBoardRow,
  MutableBoardRow,
  MutableBoardRow,
  MutableBoardRow,
  MutableBoardRow,
  MutableBoardRow,
  MutableBoardRow,
  MutableBoardRow,
  MutableBoardRow,
  MutableBoardRow,
  MutableBoardRow,
  MutableBoardRow,
];

export type BoardMatrix = readonly [...MutableBoardMatrix];

export type ActivePiece = {
  readonly type: TetrominoType;
  readonly rotation: RotationIndex;
  readonly position: BoardCoordinate;
};

export type ClearedBoardResult = {
  readonly board: BoardMatrix;
  readonly clearedLines: number;
  readonly clearedRowIndexes: readonly number[];
};

export const EMPTY_CELL: EmptyCell = { kind: "empty" };

function createMutableEmptyRow(): MutableBoardRow {
  return [
    EMPTY_CELL,
    EMPTY_CELL,
    EMPTY_CELL,
    EMPTY_CELL,
    EMPTY_CELL,
    EMPTY_CELL,
    EMPTY_CELL,
    EMPTY_CELL,
    EMPTY_CELL,
    EMPTY_CELL,
  ];
}

export function createEmptyRow(): BoardRow {
  return createMutableEmptyRow();
}

function createMutableEmptyBoard(): MutableBoardMatrix {
  return [
    createMutableEmptyRow(),
    createMutableEmptyRow(),
    createMutableEmptyRow(),
    createMutableEmptyRow(),
    createMutableEmptyRow(),
    createMutableEmptyRow(),
    createMutableEmptyRow(),
    createMutableEmptyRow(),
    createMutableEmptyRow(),
    createMutableEmptyRow(),
    createMutableEmptyRow(),
    createMutableEmptyRow(),
    createMutableEmptyRow(),
    createMutableEmptyRow(),
    createMutableEmptyRow(),
    createMutableEmptyRow(),
    createMutableEmptyRow(),
    createMutableEmptyRow(),
    createMutableEmptyRow(),
    createMutableEmptyRow(),
  ];
}

export function createEmptyBoard(): BoardMatrix {
  return createMutableEmptyBoard();
}

export function isWithinBoard({ x, y }: BoardCoordinate): boolean {
  return x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_HEIGHT;
}

export function getCell(
  board: BoardMatrix,
  coordinate: BoardCoordinate,
): CellState | null {
  if (!isWithinBoard(coordinate)) {
    return null;
  }

  return board[coordinate.y][coordinate.x];
}

export function isCellEmpty(board: BoardMatrix, coordinate: BoardCoordinate): boolean {
  const cell = getCell(board, coordinate);
  return cell?.kind === "empty";
}

export function isRowFilled(row: BoardRow): boolean {
  return row.every((cell) => cell.kind === "occupied");
}

export function createOccupiedCell(tetromino: TetrominoType): OccupiedCell {
  return {
    kind: "occupied",
    tetromino,
  };
}

export function cloneBoard(board: BoardMatrix): MutableBoardMatrix {
  return board.map((row) => [...row]) as MutableBoardMatrix;
}

export function setCell(
  board: BoardMatrix,
  coordinate: BoardCoordinate,
  cell: CellState,
): BoardMatrix {
  if (!isWithinBoard(coordinate)) {
    return board;
  }

  const nextBoard = cloneBoard(board);
  nextBoard[coordinate.y][coordinate.x] = cell;
  return nextBoard;
}

export function isValidPiecePosition(
  board: BoardMatrix,
  piece: ActivePiece,
): boolean {
  const occupiedCells = getOccupiedCells(piece.type, piece.rotation);

  return occupiedCells.every((cell) => {
    const coordinate = {
      x: piece.position.x + cell.x,
      y: piece.position.y + cell.y,
    };

    if (!isWithinBoard(coordinate)) {
      return false;
    }

    return isCellEmpty(board, coordinate);
  });
}

export function lockPiece(board: BoardMatrix, piece: ActivePiece): BoardMatrix {
  const occupiedCells = getOccupiedCells(piece.type, piece.rotation);
  let nextBoard = board;

  for (const cell of occupiedCells) {
    nextBoard = setCell(
      nextBoard,
      {
        x: piece.position.x + cell.x,
        y: piece.position.y + cell.y,
      },
      createOccupiedCell(piece.type),
    );
  }

  return nextBoard;
}

export function clearLines(board: BoardMatrix): ClearedBoardResult {
  const clearedRowIndexes = board.flatMap((row, index) => (isRowFilled(row) ? [index] : []));
  const remainingRows = board.filter((row) => !isRowFilled(row));
  const clearedLines = BOARD_HEIGHT - remainingRows.length;

  if (clearedLines === 0) {
    return {
      board,
      clearedLines: 0,
      clearedRowIndexes: [],
    };
  }

  const nextRows = [
    ...Array.from({ length: clearedLines }, () => createEmptyRow()),
    ...remainingRows,
  ] as BoardRow[];

  return {
    board: nextRows as unknown as BoardMatrix,
    clearedLines,
    clearedRowIndexes,
  };
}
