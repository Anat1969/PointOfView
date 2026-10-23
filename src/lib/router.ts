import { useSyncExternalStore } from 'react';

export type Route =
  | { page: 'home' }
  | { page: 'faces' }
  | { page: 'reflections' }
  | { page: 'history' }
  | { page: 'session'; id: string }
  | { page: 'present'; id: string; index: number };

function parse(hash: string): Route {
  const [, a, b, c] = hash.replace(/^#/, '').split('/');
  switch (a) {
    case 'faces':
      return { page: 'faces' };
    case 'reflections':
      return { page: 'reflections' };
    case 'history':
      return { page: 'history' };
    case 'session':
      return b ? { page: 'session', id: b } : { page: 'home' };
    case 'present':
      return b ? { page: 'present', id: b, index: Math.max(0, Number(c) || 0) } : { page: 'home' };
    default:
      return { page: 'home' };
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
