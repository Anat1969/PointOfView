import { useSyncExternalStore } from 'react';
import type { Face, Reflections, Session } from './types';
import { MAX_BLANKS } from './types';

type State = {
  faces: Face[];
  reflections: Reflections;
  sessions: Session[];
  /** הסשן הפתוח לעריכה. נשמר כטיוטה, ונכנס להיסטוריה רק בלחיצה על "שמירה" */
  working: Session | null;
};

const KEYS = {
  faces: 'faces.faces',
  reflections: 'faces.reflections',
  sessions: 'faces.sessions',
  working: 'faces.working',
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

let state: State = {
  faces: read(KEYS.faces, []),
  reflections: read(KEYS.reflections, { words: [], blanks: MAX_BLANKS }),
  sessions: read(KEYS.sessions, []),
  working: read(KEYS.working, null),
};

const listeners = new Set<() => void>();

export function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  for (const k of Object.keys(patch) as (keyof State)[]) {
    try {
      localStorage.setItem(KEYS[k], JSON.stringify(state[k]));
    } catch {
      /* מכסה מלאה: המצב נשאר בזיכרון */
    }
  }
  listeners.forEach((l) => l());
}

export const getState = () => state;

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}
