import { useEffect, useRef, useState } from 'react';
import type { DogStudioState } from '../lib/doginalStudio';

export function DogSprite({
  state,
  animationId,
  sheetUrl,
  isPlaying,
  onAnimationEnd,
  className = 'dog-sprite-frame',
}: {
  state: DogStudioState;
  animationId: string;
  sheetUrl: string | null;
  isPlaying: boolean;
  onAnimationEnd: () => void;
  className?: string;
}) {
  const [frame, setFrame] = useState(0);
  const frameRef = useRef(0);
  const animation = state.animations[animationId] ?? state.animations.idle;
  const endRef = useRef(onAnimationEnd);
  endRef.current = onAnimationEnd;

  useEffect(() => {
    frameRef.current = 0;
    setFrame(0);
    if (!isPlaying || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    const interval = 1000 / Math.max(1, animation.fps);

    const update = (now: number) => {
      elapsed += Math.min(now - lastTime, 250);
      lastTime = now;
      if (elapsed >= interval) {
        const steps = Math.floor(elapsed / interval);
        elapsed %= interval;
        const nextFrame = frameRef.current + steps;
        if (!animation.loop && nextFrame >= animation.frames) {
          frameRef.current = Math.max(0, animation.frames - 1);
          setFrame(frameRef.current);
          endRef.current();
          return;
        }
        frameRef.current = nextFrame % animation.frames;
        setFrame(frameRef.current);
      }
      raf = requestAnimationFrame(update);
    };

    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [animation.frames, animation.fps, animation.loop, animationId, isPlaying]);

  if (!sheetUrl) {
    return (
      <div className={`dog-sprite-placeholder ${className}`} aria-label="No sprite sheet uploaded yet">
        <svg viewBox="0 0 160 144" role="img" aria-label="Pixel dog placeholder">
          <path d="M39 49 24 20l31 16c15-7 38-7 53 1l27-18-7 40c9 13 10 34 1 48-11 17-32 24-58 22-29-2-47-17-48-41-1-15 5-29 16-39Z" />
          <path d="m33 47 10 19 15-21Zm91 0-17 20-3-22Z" />
          <path d="M64 82c5-5 10-5 15 0m11 0c5-5 10-5 15 0M77 98c4-4 9-4 13 0-2 6-11 6-13 0Z" />
          <path d="M72 107c8 8 20 8 28 0m-41 16-10 12m65-12 10 12" />
        </svg>
        <span>SPRITE SHEET NEEDED</span>
      </div>
    );
  }

  return (
    <div
      className={className}
      role="img"
      aria-label={`Doginal Dog ${animation.name} animation, frame ${frame + 1} of ${animation.frames}`}
      style={{
        width: state.frameWidth * state.scale,
        height: state.frameHeight * state.scale,
        backgroundImage: `url("${sheetUrl}")`,
        backgroundSize: `${state.sheetWidth * state.scale}px ${state.sheetHeight * state.scale}px`,
        backgroundPosition: `${-frame * state.frameWidth * state.scale}px ${-animation.row * state.frameHeight * state.scale}px`,
      }}
    />
  );
}
