export type ScreenShakeState = {
  readonly amplitude: number;
  readonly durationMs: number;
};

export const DEFAULT_SHAKE: ScreenShakeState = {
  amplitude: 2,
  durationMs: 120,
};
