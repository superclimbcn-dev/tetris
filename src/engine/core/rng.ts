import { TETROMINO_TYPES, type TetrominoType } from "@/engine/types/tetromino";

export type RandomSource = () => number;

export type SevenBagState = {
  readonly queue: readonly TetrominoType[];
  readonly random: RandomSource;
};

export function createDefaultRandomSource(): number {
  return Math.random();
}

export function shuffleBag(
  pieces: readonly TetrominoType[],
  random: RandomSource = createDefaultRandomSource,
): TetrominoType[] {
  const nextPieces = [...pieces];

  for (let index = nextPieces.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = nextPieces[index];
    nextPieces[index] = nextPieces[swapIndex];
    nextPieces[swapIndex] = current;
  }

  return nextPieces;
}

export function createSevenBag(random: RandomSource = createDefaultRandomSource): TetrominoType[] {
  return shuffleBag(TETROMINO_TYPES, random);
}

export function createSevenBagState(
  random: RandomSource = createDefaultRandomSource,
): SevenBagState {
  return {
    queue: createSevenBag(random),
    random,
  };
}

export function drawFromBag(state: SevenBagState): {
  readonly piece: TetrominoType;
  readonly state: SevenBagState;
} {
  const [first, ...rest] = state.queue;
  const nextQueue = rest.length === 0 ? createSevenBag(state.random) : rest;
  const piece = first ?? nextQueue[0];
  const queue =
    rest.length === 0 ? nextQueue.slice(1) : nextQueue;

  return {
    piece,
    state: {
      queue,
      random: state.random,
    },
  };
}

export function peekNextPieces(
  state: SevenBagState,
  count: number,
): readonly TetrominoType[] {
  if (count <= state.queue.length) {
    return state.queue.slice(0, count);
  }

  const topUp = createSevenBag(state.random);
  return [...state.queue, ...topUp].slice(0, count);
}
