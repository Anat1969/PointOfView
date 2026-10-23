import type { Reflections, Session, SessionCard } from './types';
import { getState } from './store';
import { uid } from './id';

const pick = <T,>(arr: T[]): T | undefined => arr[Math.floor(Math.random() * arr.length)];

export function reflectionDeck(r: Reflections): { refId: string; text?: string }[] {
  return [
    ...r.words.map((w) => ({ refId: w.id, text: w.text })),
    ...Array.from({ length: r.blanks }, (_, i) => ({ refId: `blank-${i + 1}` })),
  ];
}

/** שולף קלף שעוד לא נמצא בסשן. מחזיר null כשהחפיסה ריקה או מוצתה */
export function drawCard(session: Session, kind: SessionCard['kind'], exclude: string[] = []): SessionCard | null {
  const { faces, reflections } = getState();
  const used = new Set([...session.cards.filter((c) => c.kind === kind).map((c) => c.refId), ...exclude]);
  if (kind === 'face') {
    const f = pick(faces.filter((x) => !used.has(x.id)));
    return f ? { id: uid(), kind, refId: f.id, note: '' } : null;
  }
  const r = pick(reflectionDeck(reflections).filter((x) => !used.has(x.refId)));
  return r ? { id: uid(), kind, refId: r.refId, text: r.text, note: '' } : null;
}

export const isBlank = (c: SessionCard) => c.kind === 'reflection' && c.refId.startsWith('blank-');
