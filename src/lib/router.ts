import { useSyncExternalStore } from 'react';
import type { GameId } from './types';

export type Route =
  | { page: 'suite' }
  | { page: 'home'; game: GameId }
  | { page: 'library'; game: GameId }
  | { page: 'words'; game: GameId }
  | { page: 'history'; game: GameId }
  | { page: 'session'; game: GameId; id: string }
  | { page: 'present'; game: GameId; id: string; index: number };

const isGame = (g: string | undefined): g is GameId => g === 'faces' || g === 'coaching';

function parse(hash: string): Route {
  const [, a, b, c, d] = hash.replace(/^#/, '').split('/');
  // כתובות ישנות של פנים לפני סדרת הכלים
  if (a === 'session' && b) return { page: 'session', game: 'faces', id: b };
  if (a === 'present' && b) return { page: 'present', game: 'faces', id: b, index: Math.max(0, Number(c) || 0) };
  if (a === 'reflections') return { page: 'words', game: 'faces' };
  if (a === 'history') return { page: 'history', game: 'faces' };
  if (!isGame(a)) return { page: 'suite' };
  switch (b) {
    case 'library':
      return { page: 'library', game: a };
    case 'words':
      return a === 'faces' ? { page: 'words', game: a } : { page: 'home', game: a };
    case 'history':
      return { page: 'history', game: a };
    case 'session':
      return c ? { page: 'session', game: a, id: c } : { page: 'home', game: a };
    case 'present':
      return c ? { page: 'present', game: a, id: c, index: Math.max(0, Number(d) || 0) } : { page: 'home', game: a };
    default:
      return { page: 'home', game: a };
  }
}

const sub = (l: () => void) => {
  window.addEventListener('hashchange', l);
  return () => window.removeEventListener('hashchange', l);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(sub, () => location.hash);
  return parse(hash);
}

export function go(path: string, replace = false) {
  const h = '#' + path;
  if (replace) history.replaceState(null, '', h), window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = h;
}
