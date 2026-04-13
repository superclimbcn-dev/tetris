export const TETROMINO_TYPES = ["I", "J", "L", "O", "S", "T", "Z"] as const;

export type TetrominoType = (typeof TETROMINO_TYPES)[number];

export const ROTATION_STATES = [0, 1, 2, 3] as const;

export type RotationIndex = (typeof ROTATION_STATES)[number];

export type MatrixCell = 0 | 1;

export type RotationMatrix = readonly [
  readonly [MatrixCell, MatrixCell, MatrixCell, MatrixCell],
  readonly [MatrixCell, MatrixCell, MatrixCell, MatrixCell],
  readonly [MatrixCell, MatrixCell, MatrixCell, MatrixCell],
  readonly [MatrixCell, MatrixCell, MatrixCell, MatrixCell],
];

export type PieceOrigin = {
  readonly x: number;
  readonly y: number;
};

export type PieceOffset = {
  readonly x: number;
  readonly y: number;
};

export type PieceCell = PieceOffset & {
  readonly value: 1;
};

export type TetrominoDefinition = {
  readonly type: TetrominoType;
  readonly rotations: readonly [
    RotationMatrix,
    RotationMatrix,
    RotationMatrix,
    RotationMatrix,
  ];
  readonly spawnOrigin: PieceOrigin;
};

export type RotationDirection = "CW" | "CCW";

export type RotationTransitionKey =
  | "0>1"
  | "1>0"
  | "1>2"
  | "2>1"
  | "2>3"
  | "3>2"
  | "3>0"
  | "0>3";

export type KickTable = Readonly<Record<RotationTransitionKey, readonly PieceOffset[]>>;

const EMPTY_ROW = [0, 0, 0, 0] as const;

const I_ROTATIONS = [
  [
    EMPTY_ROW,
    [1, 1, 1, 1],
    EMPTY_ROW,
    EMPTY_ROW,
  ],
  [
    [0, 0, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 0],
  ],
  [
    EMPTY_ROW,
    EMPTY_ROW,
    [1, 1, 1, 1],
    EMPTY_ROW,
  ],
  [
    [0, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 0, 0],
  ],
] as const satisfies TetrominoDefinition["rotations"];

const J_ROTATIONS = [
  [
    [1, 0, 0, 0],
    [1, 1, 1, 0],
    EMPTY_ROW,
    EMPTY_ROW,
  ],
  [
    [0, 1, 1, 0],
    [0, 1, 0, 0],
    [0, 1, 0, 0],
    EMPTY_ROW,
  ],
  [
    EMPTY_ROW,
    [1, 1, 1, 0],
    [0, 0, 1, 0],
    EMPTY_ROW,
  ],
  [
    [0, 1, 0, 0],
    [0, 1, 0, 0],
    [1, 1, 0, 0],
    EMPTY_ROW,
  ],
] as const satisfies TetrominoDefinition["rotations"];

const L_ROTATIONS = [
  [
    [0, 0, 1, 0],
    [1, 1, 1, 0],
    EMPTY_ROW,
    EMPTY_ROW,
  ],
  [
    [0, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 1, 0],
    EMPTY_ROW,
  ],
  [
    EMPTY_ROW,
    [1, 1, 1, 0],
    [1, 0, 0, 0],
    EMPTY_ROW,
  ],
  [
    [1, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 0, 0],
    EMPTY_ROW,
  ],
] as const satisfies TetrominoDefinition["rotations"];

const O_ROTATIONS = [
  [
    [0, 1, 1, 0],
    [0, 1, 1, 0],
    EMPTY_ROW,
    EMPTY_ROW,
  ],
  [
    [0, 1, 1, 0],
    [0, 1, 1, 0],
    EMPTY_ROW,
    EMPTY_ROW,
  ],
  [
    [0, 1, 1, 0],
    [0, 1, 1, 0],
    EMPTY_ROW,
    EMPTY_ROW,
  ],
  [
    [0, 1, 1, 0],
    [0, 1, 1, 0],
    EMPTY_ROW,
    EMPTY_ROW,
  ],
] as const satisfies TetrominoDefinition["rotations"];

const S_ROTATIONS = [
  [
    [0, 1, 1, 0],
    [1, 1, 0, 0],
    EMPTY_ROW,
    EMPTY_ROW,
  ],
  [
    [0, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 1, 0],
    EMPTY_ROW,
  ],
  [
    EMPTY_ROW,
    [0, 1, 1, 0],
    [1, 1, 0, 0],
    EMPTY_ROW,
  ],
  [
    [1, 0, 0, 0],
    [1, 1, 0, 0],
    [0, 1, 0, 0],
    EMPTY_ROW,
  ],
] as const satisfies TetrominoDefinition["rotations"];

const T_ROTATIONS = [
  [
    [0, 1, 0, 0],
    [1, 1, 1, 0],
    EMPTY_ROW,
    EMPTY_ROW,
  ],
  [
    [0, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 1, 0, 0],
    EMPTY_ROW,
  ],
  [
    EMPTY_ROW,
    [1, 1, 1, 0],
    [0, 1, 0, 0],
    EMPTY_ROW,
  ],
  [
    [0, 1, 0, 0],
    [1, 1, 0, 0],
    [0, 1, 0, 0],
    EMPTY_ROW,
  ],
] as const satisfies TetrominoDefinition["rotations"];

const Z_ROTATIONS = [
  [
    [1, 1, 0, 0],
    [0, 1, 1, 0],
    EMPTY_ROW,
    EMPTY_ROW,
  ],
  [
    [0, 0, 1, 0],
    [0, 1, 1, 0],
    [0, 1, 0, 0],
    EMPTY_ROW,
  ],
  [
    EMPTY_ROW,
    [1, 1, 0, 0],
    [0, 1, 1, 0],
    EMPTY_ROW,
  ],
  [
    [0, 1, 0, 0],
    [1, 1, 0, 0],
    [1, 0, 0, 0],
    EMPTY_ROW,
  ],
] as const satisfies TetrominoDefinition["rotations"];

export const TETROMINO_DEFINITIONS: Readonly<Record<TetrominoType, TetrominoDefinition>> = {
  I: { type: "I", rotations: I_ROTATIONS, spawnOrigin: { x: 3, y: 0 } },
  J: { type: "J", rotations: J_ROTATIONS, spawnOrigin: { x: 3, y: 0 } },
  L: { type: "L", rotations: L_ROTATIONS, spawnOrigin: { x: 3, y: 0 } },
  O: { type: "O", rotations: O_ROTATIONS, spawnOrigin: { x: 4, y: 0 } },
  S: { type: "S", rotations: S_ROTATIONS, spawnOrigin: { x: 3, y: 0 } },
  T: { type: "T", rotations: T_ROTATIONS, spawnOrigin: { x: 3, y: 0 } },
  Z: { type: "Z", rotations: Z_ROTATIONS, spawnOrigin: { x: 3, y: 0 } },
} as const;

export const JLSTZ_KICK_TABLE: KickTable = {
  "0>1": [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -1, y: 1 },
    { x: 0, y: -2 },
    { x: -1, y: -2 },
  ],
  "1>0": [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: -1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
  ],
  "1>2": [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: -1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
  ],
  "2>1": [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -1, y: 1 },
    { x: 0, y: -2 },
    { x: -1, y: -2 },
  ],
  "2>3": [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: -2 },
    { x: 1, y: -2 },
  ],
  "3>2": [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: 2 },
    { x: -1, y: 2 },
  ],
  "3>0": [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: 2 },
    { x: -1, y: 2 },
  ],
  "0>3": [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: -2 },
    { x: 1, y: -2 },
  ],
};

export const I_KICK_TABLE: KickTable = {
  "0>1": [
    { x: 0, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: -1 },
    { x: 1, y: 2 },
  ],
  "1>0": [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: 1 },
    { x: -1, y: -2 },
  ],
  "1>2": [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: 2 },
    { x: 2, y: -1 },
  ],
  "2>1": [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: -2 },
    { x: -2, y: 1 },
  ],
  "2>3": [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: 1 },
    { x: -1, y: -2 },
  ],
  "3>2": [
    { x: 0, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: -1 },
    { x: 1, y: 2 },
  ],
  "3>0": [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: -2 },
    { x: -2, y: 1 },
  ],
  "0>3": [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: 2 },
    { x: 2, y: -1 },
  ],
};

export const O_KICK_TABLE: KickTable = {
  "0>1": [{ x: 0, y: 0 }],
  "1>0": [{ x: 0, y: 0 }],
  "1>2": [{ x: 0, y: 0 }],
  "2>1": [{ x: 0, y: 0 }],
  "2>3": [{ x: 0, y: 0 }],
  "3>2": [{ x: 0, y: 0 }],
  "3>0": [{ x: 0, y: 0 }],
  "0>3": [{ x: 0, y: 0 }],
};

export function getRotationTransitionKey(
  from: RotationIndex,
  to: RotationIndex,
): RotationTransitionKey {
  return `${from}>${to}` as RotationTransitionKey;
}

export function getTetrominoDefinition(type: TetrominoType): TetrominoDefinition {
  return TETROMINO_DEFINITIONS[type];
}

export function getRotationMatrix(
  type: TetrominoType,
  rotation: RotationIndex,
): RotationMatrix {
  return TETROMINO_DEFINITIONS[type].rotations[rotation];
}

export function getOccupiedCells(
  type: TetrominoType,
  rotation: RotationIndex,
): readonly PieceCell[] {
  const matrix = getRotationMatrix(type, rotation);
  const cells: PieceCell[] = [];

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex];

    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      const value = row[columnIndex];

      if (value === 1) {
        cells.push({
          x: columnIndex,
          y: rowIndex,
          value,
        });
      }
    }
  }

  return cells;
}

export function getKickTable(type: TetrominoType): KickTable {
  if (type === "I") {
    return I_KICK_TABLE;
  }

  if (type === "O") {
    return O_KICK_TABLE;
  }

  return JLSTZ_KICK_TABLE;
}
