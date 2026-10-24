import { useSyncExternalStore } from 'react';
import type { Face, Reflections, Session } from './types';
import { MAX_BLANKS } from './types';

export type SyncStatus = 'loading' | 'ready' | 'offline';

type State = {
  /** הספריות מגיעות מ-Supabase ונשמרות גם כעותק מקומי לעבודה בלי רשת */
  faces: Face[];
  reflections: Reflections;
  /** סשנים נשארים במכשיר: ההערות בהם אישיות */
  sessions: Session[];
  /** הסשן הפתוח לעריכה. נשמר כטיוטה, ונכנס להיסטוריה רק בלחיצה על "שמירה" */
  working: Session | null;
  sync: SyncStatus;
  canEdit: boolean;
};

const KEYS: Partial<Record<keyof State, string>> = {
  faces: 'faces.lib.faces',
  reflections: 'faces.lib.reflections',
  sessions: 'faces.sessions',
  working: 'faces.working',
};

function read<T>(key: string | undefined, fallback: T): T {
  if (!key) return fallback;
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
  sync: 'loading',
  canEdit: false,
};

const listeners = new Set<() => void>();

export function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  for (const k of Object.keys(patch) as (keyof State)[]) {
    const key = KEYS[k];
    if (!key) continue;
    try {
      localStorage.setItem(key, JSON.stringify(state[k]));
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
