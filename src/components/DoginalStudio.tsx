import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  loadDogStudio,
  saveDogStudio,
  type DogAnimation,
  type DogAnimationTrigger,
  type DogStudioState,
} from '../lib/doginalStudio';
import { DogSprite } from './DogSprite';

type StudioModal = 'animations' | 'triggers' | null;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function StudioDialog({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-dialog-focus]')?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="dog-studio-dialog"
      aria-labelledby="dog-studio-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header className="dog-studio-dialog-heading">
        <div>
          <span className="eyebrow">Doginal Dog studio</span>
          <h2 id="dog-studio-dialog-title">{title}</h2>
          <p>{description}</p>
        </div>
        <button type="button" className="dog-studio-dialog-close" data-dialog-focus onClick={onClose}>
          Close
        </button>
      </header>
      {children}
    </dialog>
  );
}

export function DoginalStudio({ hidden }: { hidden: boolean }) {
  const [studio, setStudio] = useState<DogStudioState | null>(null);
  const [modal, setModal] = useState<StudioModal>(null);
  const [selectedAnimation, setSelectedAnimation] = useState('idle');
  const [previewAnimation, setPreviewAnimation] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animations = useMemo(() => Object.entries(studio?.animations ?? {}), [studio?.animations]);
  const currentAnimation = previewAnimation || selectedAnimation;
  const sheetUrl = useMemo(
    () => studio?.sheetBlob ? URL.createObjectURL(studio.sheetBlob) : null,
    [studio?.sheetBlob],
  );

  useEffect(() => () => {
    if (sheetUrl) URL.revokeObjectURL(sheetUrl);
  }, [sheetUrl]);

  useEffect(() => {
    let active = true;
    void loadDogStudio().then((loaded) => {
      if (!active) return;
      setStudio(loaded);
      setSelectedAnimation(Object.keys(loaded.animations)[0] ?? '');
    }).catch((reason: unknown) => {
      if (active) setError(errorMessage(reason));
    });
    return () => {
      active = false;
    };
  }, []);

  const updateStudio = (update: Partial<DogStudioState>) => {
    setStudio((current) => current ? { ...current, ...update } : current);
    setNotice('');
  };

  const uploadSpriteSheet = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setError('');
    setNotice('');
    if (!['image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a PNG or WebP sprite sheet.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('Sprite sheets must be 12 MB or smaller.');
      return;
    }
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      setError('That image could not be decoded. Try exporting the sheet again.');
      return;
    }
    const { width, height } = bitmap;
    bitmap.close();
    if (width < 1 || height < 1 || width > 8192 || height > 8192) {
      setError('Sprite sheet dimensions must be between 1 and 8,192 pixels.');
      return;
    }
    setStudio((current) => current ? {
      ...current,
      sheetBlob: file,
      sheetName: file.name,
      sheetWidth: width,
      sheetHeight: height,
    } : current);
    setNotice(`${file.name} loaded. Set its frame size and save the studio.`);
  };

  const save = async () => {
    if (!studio) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (!studio.dogId.trim()) {
        throw new Error('Give your Doginal Dog a name before saving.');
      }
      if (!studio.animations.idle) {
        throw new Error('Keep an idle animation so the Doginal Dog has a safe default.');
      }
      if (studio.sheetBlob) {
        if (studio.frameWidth < 1 || studio.frameHeight < 1
          || studio.sheetWidth % studio.frameWidth !== 0
          || studio.sheetHeight % studio.frameHeight !== 0) {
          throw new Error('Frame width and height must divide evenly into the sprite sheet dimensions.');
        }
        for (const [id, animation] of Object.entries(studio.animations)) {
          if (!Number.isInteger(animation.row) || animation.row < 0
            || !Number.isInteger(animation.frames) || animation.frames < 1
            || !Number.isInteger(animation.fps) || animation.fps < 1 || animation.fps > 30) {
            throw new Error(`${animation.name || id} needs a valid row, frame count, and frame rate (1–30 FPS).`);
          }
          if ((animation.row + 1) * studio.frameHeight > studio.sheetHeight
            || animation.frames * studio.frameWidth > studio.sheetWidth) {
            throw new Error(`${animation.name || id} extends beyond the uploaded sprite sheet.`);
          }
        }
      }
      for (const trigger of studio.triggers) {
        if (!trigger.name.trim() || !studio.animations[trigger.animation]
          || !Number.isFinite(trigger.priceThreshold)) {
          throw new Error('Each market trigger needs a name, valid price threshold, and existing animation.');
        }
      }
      await saveDogStudio(studio);
      setNotice('Doginal Dog studio saved on this device.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const updateAnimation = (id: string, update: Partial<DogAnimation>) => {
    if (!studio) return;
    updateStudio({
      animations: {
        ...studio.animations,
        [id]: { ...studio.animations[id], ...update },
      },
    });
  };

  const addAnimation = () => {
    if (!studio) return;
    let key = 'new_animation';
    let suffix = 2;
    while (studio.animations[key]) key = `new_animation_${suffix++}`;
    const nextAnimation = { name: 'New animation', row: 0, frames: 1, fps: 6, loop: true };
    updateStudio({ animations: { ...studio.animations, [key]: nextAnimation } });
    setSelectedAnimation(key);
  };

  const removeAnimation = (id: string) => {
    if (!studio || id === 'idle') return;
    const next = { ...studio.animations };
    delete next[id];
    updateStudio({
      animations: next,
      triggers: studio.triggers.map((trigger) => trigger.animation === id
        ? { ...trigger, animation: 'idle' }
        : trigger),
    });
    if (selectedAnimation === id) setSelectedAnimation('idle');
    if (previewAnimation === id) setPreviewAnimation('');
  };

  const addTrigger = () => {
    if (!studio) return;
    const trigger: DogAnimationTrigger = {
      id: crypto.randomUUID(),
      name: 'New market trigger',
      trend: 'any',
      volatility: 'any',
      priceOperator: 'any',
      priceThreshold: 0,
      animation: 'idle',
      enabled: false,
    };
    updateStudio({ triggers: [...studio.triggers, trigger] });
  };

  const updateTrigger = (id: string, update: Partial<DogAnimationTrigger>) => {
    if (!studio) return;
    updateStudio({
      triggers: studio.triggers.map((trigger) => trigger.id === id ? { ...trigger, ...update } : trigger),
    });
  };

  const finishPreview = useCallback(() => {
    setPreviewAnimation('');
    setIsPlaying(false);
  }, []);

  if (!studio) {
    return (
      <section id="panel-doginal" className="dog-studio settings-workspace" role="tabpanel"
        aria-labelledby="tab-doginal" tabIndex={0} hidden={hidden}>
        <p role="status">Loading local Doginal Dog studio…</p>
      </section>
    );
  }

  return (
    <motion.section
      id="panel-doginal"
      className="dog-studio settings-workspace"
      role="tabpanel"
      aria-labelledby="tab-doginal"
      tabIndex={0}
      hidden={hidden}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <header className="settings-page-header dog-studio-page-heading">
        <div>
          <h1>Doginal Dogs</h1>
          <p>Bring your ordinal to life. Sprite art, animations, and behavior rules stay on this device.</p>
        </div>
        <button type="button" className="btn btn-primary dog-save-button" disabled={busy} onClick={() => void save()}>
          {busy ? 'Saving…' : 'Save studio'}
        </button>
      </header>

      {error && <p className="dog-studio-feedback is-error" role="alert">{error}</p>}
      {notice && <p className="dog-studio-feedback is-success" role="status">{notice}</p>}

      <div className="dog-studio-layout">
        <section className="panel dog-preview-panel" aria-label="Dog sprite preview">
          <div className="dog-studio-card-heading">
            <div>
              <h2>{studio.dogId}</h2>
            </div>
            <span className={`dog-live-state ${studio.sheetBlob ? 'has-sheet' : ''}`}>
              <i /> {studio.sheetBlob ? 'SPRITE LOADED' : 'AWAITING SPRITE'}
            </span>
          </div>

          <div className="dog-stage">
            <div className="dog-stage-stars" aria-hidden="true">✦　 ·　 ✦　 ·　 ✧</div>
            {studio.sheetBlob && sheetUrl
              ? <DogSprite state={studio} animationId={currentAnimation} sheetUrl={sheetUrl}
                isPlaying={isPlaying} onAnimationEnd={finishPreview} />
              : (
                <div className="dog-placeholder-art">
                  <svg viewBox="0 0 160 144" role="img" aria-label="Pixel dog placeholder">
                    <path d="M39 49 24 20l31 16c15-7 38-7 53 1l27-18-7 40c9 13 10 34 1 48-11 17-32 24-58 22-29-2-47-17-48-41-1-15 5-29 16-39Z" />
                    <path d="m33 47 10 19 15-21Zm91 0-17 20-3-22Z" />
                    <path d="M64 82c5-5 10-5 15 0m11 0c5-5 10-5 15 0M77 98c4-4 9-4 13 0-2 6-11 6-13 0Z" />
                    <path d="M72 107c8 8 20 8 28 0m-41 16-10 12m65-12 10 12" />
                  </svg>
                  <span>YOUR DOG'S SPOT</span>
                </div>
              )}
            <div className="dog-thought-bubble" aria-live="polite">
              {previewAnimation
                ? `Previewing ${studio.animations[previewAnimation]?.name ?? previewAnimation}`
                : studio.sheetBlob
                  ? `${studio.animations[currentAnimation]?.name ?? 'Idle'} · ready to play`
                  : 'Good things come to those who fetch.'}
            </div>
            <span className="dog-stage-caption">DOGINAL DOG · FIRST MATE</span>
          </div>

          <div className="dog-player-controls">
            <label className="form-field" htmlFor="dog-preview-animation">
              Preview animation
              <select id="dog-preview-animation" className="input" value={selectedAnimation}
                onChange={(event) => {
                  setSelectedAnimation(event.target.value);
                  setPreviewAnimation('');
                  setIsPlaying(false);
                }}>
                {animations.map(([id, animation]) => <option key={id} value={id}>{animation.name}</option>)}
              </select>
            </label>
            <button type="button" className="btn btn-secondary" disabled={!studio.sheetBlob}
              onClick={() => {
              setPreviewAnimation(selectedAnimation);
              setIsPlaying(true);
              setNotice('Manual animation preview only. This does not use or simulate live market data.');
            }}>{previewAnimation && isPlaying ? '▶ Restart' : previewAnimation ? '▶ Resume' : '▶ Preview'}</button>
            {previewAnimation && isPlaying && (
              <button type="button" className="btn btn-quiet" onClick={() => setIsPlaying(false)}>Pause</button>
            )}
            {previewAnimation && (
              <button type="button" className="btn btn-quiet" onClick={finishPreview}>Stop</button>
            )}
          </div>

          <div className="dog-feed-status">
            <span className="dog-feed-indicator" />
            <div><strong>Market triggers on hold</strong><small>No verified 1-minute trend feed is connected.</small></div>
            <button type="button" className="text-button" onClick={() => setModal('triggers')}>Set rules</button>
          </div>
        </section>

        <aside className="dog-studio-controls">
          <section className="panel dog-upload-card">
            <div className="dog-studio-card-heading">
              <div><h2>Sprite sheet</h2></div>
              <span className="dog-step-number">01</span>
            </div>
            <div className="dog-upload-dropzone">
              <span className="dog-upload-icon" aria-hidden="true">↑</span>
              <strong>{studio.sheetName || 'Bring your dog aboard'}</strong>
              <span>{studio.sheetBlob
                ? `${studio.sheetWidth} × ${studio.sheetHeight} px`
                : 'Piskel PNG or WebP · up to 12 MB'}</span>
              <input ref={fileInputRef} id="dog-sheet-upload" type="file" accept="image/png,image/webp"
                className="dog-file-input" onChange={(event) => void uploadSpriteSheet(event)} />
              <button type="button" className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}>
                {studio.sheetBlob ? 'Replace sprite sheet' : 'Upload sprite sheet'}
              </button>
            </div>
            <label className="form-field dog-name-field" htmlFor="dog-studio-name">
              Dog name
              <input id="dog-studio-name" className="input" maxLength={48} value={studio.dogId}
                onChange={(event) => updateStudio({ dogId: event.target.value })} />
            </label>
          </section>

          <section className="panel dog-setup-card">
            <div className="dog-studio-card-heading">
              <div><h2>Animation deck</h2></div>
              <span className="dog-step-number">02</span>
            </div>
            <p>Set frame size, row, frame count, and playback speed for each Piskel animation.</p>
            <div className="dog-deck-summary">
              <span>{animations.length} animations</span>
              <span>{studio.frameWidth} × {studio.frameHeight} frame</span>
            </div>
            <button type="button" className="btn btn-secondary dog-wide-button" onClick={() => setModal('animations')}>
              Edit animation settings
            </button>
          </section>

          <section className="panel dog-setup-card">
            <div className="dog-studio-card-heading">
              <div><h2>Market triggers</h2></div>
              <span className="dog-step-number">03</span>
            </div>
            <p>Choose which animation each trend, volatility, or 1-minute change should call.</p>
            <div className="dog-deck-summary">
              <span>{studio.triggers.length} rules</span>
              <span>{studio.triggers.filter((trigger) => trigger.enabled).length} enabled</span>
            </div>
            <button type="button" className="btn btn-secondary dog-wide-button" onClick={() => setModal('triggers')}>
              Configure trigger rules
            </button>
          </section>

          <p className="dog-local-note">Sprite art and studio settings are saved locally in this app. No NFT or market data is uploaded.</p>
        </aside>
      </div>

      {modal === 'animations' && (
        <StudioDialog title="Animation settings" description="Rows and frame counts are zero-indexed from the top-left of the sprite sheet."
          onClose={() => setModal(null)}>
          <div className="dog-dialog-content">
            <div className="dog-frame-size-fields">
              <label className="form-field">Frame width
                <input className="input" type="number" min={1} max={2048} value={studio.frameWidth}
                  onChange={(event) => updateStudio({ frameWidth: Number(event.target.value) || 1 })} />
              </label>
              <label className="form-field">Frame height
                <input className="input" type="number" min={1} max={2048} value={studio.frameHeight}
                  onChange={(event) => updateStudio({ frameHeight: Number(event.target.value) || 1 })} />
              </label>
              <label className="form-field">Pixel scale
                <input className="input" type="number" min={1} max={10} value={studio.scale}
                  onChange={(event) => updateStudio({ scale: Math.min(10, Math.max(1, Number(event.target.value) || 1)) })} />
              </label>
            </div>
            <div className="dog-animation-list">
              {animations.map(([id, animation]) => (
                <article className="dog-animation-row" key={id}>
                  <div className="dog-animation-row-heading">
                    <label className="form-field dog-animation-name">Animation name
                      <input className="input" maxLength={48} value={animation.name}
                        onChange={(event) => updateAnimation(id, { name: event.target.value })} />
                    </label>
                    <span className="dog-animation-key">{id}</span>
                    {id !== 'idle' && <button type="button" className="text-button" onClick={() => removeAnimation(id)}>Remove</button>}
                  </div>
                  <div className="dog-animation-fields">
                    <label className="form-field">Row
                      <input className="input" type="number" min={0} max={255} value={animation.row}
                        onChange={(event) => updateAnimation(id, { row: Number(event.target.value) || 0 })} />
                    </label>
                    <label className="form-field">Frames
                      <input className="input" type="number" min={1} max={512} value={animation.frames}
                        onChange={(event) => updateAnimation(id, { frames: Math.max(1, Number(event.target.value) || 1) })} />
                    </label>
                    <label className="form-field">FPS
                      <input className="input" type="number" min={1} max={30} value={animation.fps}
                        onChange={(event) => updateAnimation(id, { fps: Math.min(30, Math.max(1, Number(event.target.value) || 1)) })} />
                    </label>
                    <label className="dog-loop-control">
                      <input type="checkbox" checked={animation.loop}
                        onChange={(event) => updateAnimation(id, { loop: event.target.checked })} />
                      Loop
                    </label>
                  </div>
                </article>
              ))}
            </div>
            <div className="dog-dialog-footer">
              <button type="button" className="btn btn-secondary" onClick={addAnimation}>+ Add animation</button>
              <button type="button" className="btn btn-primary" onClick={() => setModal(null)}>Done</button>
            </div>
          </div>
        </StudioDialog>
      )}

      {modal === 'triggers' && (
        <StudioDialog title="Market animation triggers" description="Conditions combine as AND rules. Configured triggers only run once verified market telemetry is connected."
          onClose={() => setModal(null)}>
          <div className="dog-dialog-content">
            <p className="dog-trigger-disclaimer">
              Live trigger evaluation is paused: this workspace has no 1-minute trend or volatility feed yet. Use Preview for a manual animation check; it does not simulate market data.
            </p>
            <div className="dog-trigger-list">
              {studio.triggers.map((trigger) => (
                <article className={`dog-trigger-row ${trigger.enabled ? 'is-enabled' : ''}`} key={trigger.id}>
                  <div className="dog-trigger-heading">
                    <label className="dog-trigger-enable">
                      <input type="checkbox" checked={trigger.enabled}
                        onChange={(event) => updateTrigger(trigger.id, { enabled: event.target.checked })} />
                      Enable
                    </label>
                    <label className="form-field dog-trigger-name">Rule name
                      <input className="input" maxLength={48} value={trigger.name}
                        onChange={(event) => updateTrigger(trigger.id, { name: event.target.value })} />
                    </label>
                    <button type="button" className="text-button"
                      onClick={() => updateStudio({ triggers: studio.triggers.filter((item) => item.id !== trigger.id) })}>
                      Remove
                    </button>
                  </div>
                  <div className="dog-trigger-fields">
                    <label className="form-field">Trend
                      <select className="input" value={trigger.trend}
                        onChange={(event) => updateTrigger(trigger.id, { trend: event.target.value as DogAnimationTrigger['trend'] })}>
                        <option value="any">Any trend</option>
                        <option value="pumping">Pumping</option>
                        <option value="dumping">Dumping</option>
                        <option value="sideways">Sideways</option>
                      </select>
                    </label>
                    <label className="form-field">Volatility
                      <select className="input" value={trigger.volatility}
                        onChange={(event) => updateTrigger(trigger.id, { volatility: event.target.value as DogAnimationTrigger['volatility'] })}>
                        <option value="any">Any</option>
                        <option value="low">Low</option>
                        <option value="high">High</option>
                      </select>
                    </label>
                    <label className="form-field">1m price change
                      <select className="input" value={trigger.priceOperator}
                        onChange={(event) => updateTrigger(trigger.id, { priceOperator: event.target.value as DogAnimationTrigger['priceOperator'] })}>
                        <option value="any">Any change</option>
                        <option value="above">Above threshold</option>
                        <option value="below">Below threshold</option>
                      </select>
                    </label>
                    <label className="form-field">Threshold (%)
                      <input className="input" type="number" step="0.1" value={trigger.priceThreshold}
                        disabled={trigger.priceOperator === 'any'}
                        onChange={(event) => updateTrigger(trigger.id, { priceThreshold: Number(event.target.value) || 0 })} />
                    </label>
                    <label className="form-field">Play animation
                      <select className="input" value={trigger.animation}
                        onChange={(event) => updateTrigger(trigger.id, { animation: event.target.value })}>
                        {animations.map(([id, animation]) => <option key={id} value={id}>{animation.name}</option>)}
                      </select>
                    </label>
                  </div>
                </article>
              ))}
            </div>
            <div className="dog-dialog-footer">
              <button type="button" className="btn btn-secondary" onClick={addTrigger}>+ Add trigger rule</button>
              <button type="button" className="btn btn-primary" onClick={() => setModal(null)}>Done</button>
            </div>
          </div>
        </StudioDialog>
      )}
    </motion.section>
  );
}
