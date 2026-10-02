import { useEffect, useMemo, useState } from 'react';
import { createDefaultDogStudio, loadDogStudio, type DogStudioState } from '../lib/doginalStudio';
import { DogSprite } from './DogSprite';

export function DoginalCompanionWindow() {
  const [studio, setStudio] = useState<DogStudioState>(createDefaultDogStudio);
  const [error, setError] = useState('');
  const sheetUrl = useMemo(
    () => studio.sheetBlob ? URL.createObjectURL(studio.sheetBlob) : null,
    [studio.sheetBlob],
  );

  useEffect(() => () => {
    if (sheetUrl) URL.revokeObjectURL(sheetUrl);
  }, [sheetUrl]);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void loadDogStudio().then((current) => {
        if (!active) return;
        setStudio(current);
        setError('');
      }).catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      });
    };
    refresh();
    window.addEventListener('doginal-studio-updated', refresh);
    return () => {
      active = false;
      window.removeEventListener('doginal-studio-updated', refresh);
    };
  }, []);

  const animationId = studio.animations.idle ? 'idle' : Object.keys(studio.animations)[0] ?? '';

  return (
    <div className="dog-companion-window" role="img"
      aria-label={error || `Doginal Dog ${studio.dogId}, ${studio.sheetBlob ? 'sprite loaded' : 'waiting for sprite sheet'}`}>
      <div className="dog-companion-titlebar" aria-hidden="true">
        <span>DOGINAL DOG · FIRST MATE</span>
        <span className="dog-companion-lights"><i /><i /><i /></span>
      </div>
      <div className="dog-companion-scene" aria-hidden="true">
        <span className="dog-companion-sky">✦　·　✧</span>
        <DogSprite
          state={studio}
          animationId={animationId}
          sheetUrl={sheetUrl}
          isPlaying={Boolean(sheetUrl)}
          onAnimationEnd={() => undefined}
          className="dog-companion-sprite"
        />
        <span className="dog-companion-caption">
          {error ? 'CHECK LOCAL STUDIO' : studio.sheetBlob ? 'ON DECK · VIBING' : 'ADD SPRITES IN DOGINAL DOGS'}
        </span>
      </div>
    </div>
  );
}
