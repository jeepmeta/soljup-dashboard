export interface DogAnimation {
  name: string;
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
}

export type DogTrend = 'pumping' | 'dumping' | 'sideways';

export interface DogAnimationTrigger {
  id: string;
  name: string;
  trend: DogTrend | 'any';
  volatility: 'low' | 'high' | 'any';
  priceOperator: 'above' | 'below' | 'any';
  priceThreshold: number;
  animation: string;
  enabled: boolean;
}

export interface DogStudioState {
  dogId: string;
  sheetName: string;
  sheetBlob: Blob | null;
  sheetWidth: number;
  sheetHeight: number;
  frameWidth: number;
  frameHeight: number;
  scale: number;
  animations: Record<string, DogAnimation>;
  triggers: DogAnimationTrigger[];
}

const DATABASE_NAME = 'soljup-doginal-studio';
const STORE_NAME = 'studio';
const STUDIO_KEY = 'main';

const starterAnimations: Record<string, DogAnimation> = {
  idle: { name: 'Idle', row: 0, frames: 4, fps: 6, loop: true },
  sit: { name: 'Sit', row: 1, frames: 3, fps: 4, loop: true },
  nap: { name: 'Nap', row: 2, frames: 4, fps: 2, loop: true },
  play_ball: { name: 'Play ball', row: 3, frames: 6, fps: 8, loop: true },
  ride_green_candle: { name: 'Ride green candle', row: 4, frames: 4, fps: 12, loop: true },
  dodge_red_candle: { name: 'Dodge red candle', row: 5, frames: 4, fps: 14, loop: true },
  teleport: { name: 'Teleport', row: 6, frames: 8, fps: 16, loop: false },
};

export function createDefaultDogStudio(): DogStudioState {
  return {
    dogId: 'Doginal First Mate',
    sheetName: '',
    sheetBlob: null,
    sheetWidth: 0,
    sheetHeight: 0,
    frameWidth: 32,
    frameHeight: 32,
    scale: 4,
    animations: structuredClone(starterAnimations),
    triggers: [
      {
        id: crypto.randomUUID(),
        name: 'Catch a pump',
        trend: 'pumping',
        volatility: 'any',
        priceOperator: 'above',
        priceThreshold: 0.5,
        animation: 'ride_green_candle',
        enabled: false,
      },
      {
        id: crypto.randomUUID(),
        name: 'Dodge a dump',
        trend: 'dumping',
        volatility: 'any',
        priceOperator: 'any',
        priceThreshold: 0,
        animation: 'dodge_red_candle',
        enabled: false,
      },
      {
        id: crypto.randomUUID(),
        name: 'Chill sideways',
        trend: 'sideways',
        volatility: 'any',
        priceOperator: 'any',
        priceThreshold: 0,
        animation: 'nap',
        enabled: false,
      },
    ],
  };
}

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase() {
  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('Local sprite storage is unavailable in this browser.'));
  }
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not open local sprite storage.'));
      request.onblocked = () => reject(new Error('Local sprite storage is blocked by another open app window.'));
    });
  }
  return databasePromise;
}

export async function loadDogStudio(): Promise<DogStudioState> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(STUDIO_KEY);
    request.onsuccess = () => {
      const stored = request.result as Partial<DogStudioState> | undefined;
      if (!stored) {
        resolve(createDefaultDogStudio());
        return;
      }
      const defaults = createDefaultDogStudio();
      resolve({
        ...defaults,
        ...stored,
        animations: { ...defaults.animations, ...stored.animations },
        triggers: stored.triggers ?? defaults.triggers,
      });
    };
    request.onerror = () => reject(request.error ?? new Error('Could not load the saved Doginal Dog studio.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Loading the Doginal Dog studio was interrupted.'));
  });
}

export async function saveDogStudio(state: DogStudioState): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(state, STUDIO_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save the Doginal Dog studio.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Saving the Doginal Dog studio was interrupted.'));
  });
  window.dispatchEvent(new Event('doginal-studio-updated'));
}
