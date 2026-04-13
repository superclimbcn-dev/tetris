"use client";

import { ArrowBigDown, ArrowLeft, ArrowRight, RotateCw, Save } from "lucide-react";

type MobileControlsProps = {
  readonly onPrimeAudio: () => void;
  readonly onMoveLeft: () => void;
  readonly onMoveRight: () => void;
  readonly onRotate: () => void;
  readonly onHardDrop: () => void;
  readonly onHold: () => void;
};

function vibrateBriefly() {
  navigator.vibrate?.(10);
}

export function MobileControls({
  onPrimeAudio,
  onMoveLeft,
  onMoveRight,
  onRotate,
  onHardDrop,
  onHold,
}: MobileControlsProps) {
  const trigger = (callback: () => void) => {
    onPrimeAudio();
    vibrateBriefly();
    callback();
  };

  const buttonClassName =
    "mobile-controls-button inline-flex min-h-14 min-w-14 items-center justify-center rounded-2xl border border-border/70 bg-card/85 text-foreground shadow-lg shadow-black/25 backdrop-blur transition active:scale-95 active:opacity-80";

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md items-end justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:hidden">
      <div className="grid w-full grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 rounded-[28px] border border-border/60 bg-background/70 p-3 shadow-[0_24px_80px_rgba(2,6,23,0.6)] backdrop-blur-xl">
        <button
          type="button"
          className={buttonClassName}
          aria-label="Move left"
          onClick={() => trigger(onMoveLeft)}
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          className={buttonClassName}
          aria-label="Rotate piece"
          onClick={() => trigger(onRotate)}
        >
          <RotateCw className="h-6 w-6" />
        </button>
        <button
          type="button"
          className={buttonClassName}
          aria-label="Hard drop"
          onClick={() => trigger(onHardDrop)}
        >
          <ArrowBigDown className="h-6 w-6" />
        </button>
        <button
          type="button"
          className={buttonClassName}
          aria-label="Move right"
          onClick={() => trigger(onMoveRight)}
        >
          <ArrowRight className="h-6 w-6" />
        </button>
        <button
          type="button"
          className={`${buttonClassName} min-w-12 px-3`}
          aria-label="Hold piece"
          onClick={() => trigger(onHold)}
        >
          <Save className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
