export type EnvelopeSettings = {
  readonly attack: number;
  readonly decay: number;
  readonly sustain: number;
  readonly release: number;
};

export const DEFAULT_ENVELOPE: EnvelopeSettings = {
  attack: 0.01,
  decay: 0.08,
  sustain: 0.65,
  release: 0.12,
};
