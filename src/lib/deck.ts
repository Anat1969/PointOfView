import type { Reflections, Session, SessionCard } from './types';
import { getState } from './store';
import { uid } from './id';
import { CLARITY_QUESTIONS, CLARITY_WORDS, questionId, wordId } from './clarity';

const pick = <T,>(arr: T[]): T | undefined => arr[Math.floor(Math.random() * arr.length)];

export function reflectionDeck(r: Reflections): { refId: string; text?: string }[] {
  return [
    ...r.words.map((w) => ({ refId: w.id, text: w.text })),
    ...Array.from({ length: r.blanks }, (_, i) => ({ refId: `blank-${i + 1}` })),
  ];
}

/** שולף קלף שעוד לא נמצא בסשן. מחזיר null כשהחפיסה ריקה או מוצתה */
export function drawCard(session: Session, kind: SessionCard['kind'], exclude: string[] = []): SessionCard | null {
  const { faces, reflections, coachCards } = getState();
  const used = new Set([...session.cards.filter((c) => c.kind === kind).map((c) => c.refId), ...exclude]);
  if (kind === 'word' || kind === 'question') {
    const list = kind === 'word' ? CLARITY_WORDS.map((t, i) => ({ refId: wordId(i), text: t })) : CLARITY_QUESTIONS.map((t, i) => ({ refId: questionId(i), text: t }));
    const c = pick(list.filter((x) => !used.has(x.refId)));
    return c ? { id: uid(), kind, refId: c.refId, text: c.text, note: '' } : null;
  }
  if (kind === 'photo') {
    const c = pick(coachCards.filter((x) => !used.has(x.id)));
    return c ? { id: uid(), kind, refId: c.id, note: '' } : null;
  }
  if (kind === 'coach') {
    const c = pick(coachCards.filter((x) => !used.has(x.id)));
    return c ? { id: uid(), kind, refId: c.id, text: c.word, note: '' } : null;
  }
  if (kind === 'face') {
    const f = pick(faces.filter((x) => !used.has(x.id)));
    return f ? { id: uid(), kind, refId: f.id, note: '' } : null;
  }
  const r = pick(reflectionDeck(reflections).filter((x) => !used.has(x.refId)));
  return r ? { id: uid(), kind, refId: r.refId, text: r.text, note: '' } : null;
}

export const isBlank = (c: SessionCard) => c.kind === 'reflection' && c.refId.startsWith('blank-');
