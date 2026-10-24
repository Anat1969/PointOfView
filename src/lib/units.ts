import { GAMES, gameOf } from './games';
import type { GameForm, Session, SessionCard } from './types';

/** יחידה על השולחן: קלף בודד, או זוג פנים והשתקפות */
export type Unit = { key: string; cards: SessionCard[]; stage?: number };

export const formOf = (s: Session): GameForm => s.form ?? GAMES[gameOf(s)].defaultForm;

export function toUnits(s: Session): Unit[] {
  // מפת שלוש התחנות: יחידה לכל תחנה, לפי סדר התהליך
  if (formOf(s) === 'journey')
    return [0, 1, 2].map((st) => ({ key: `station-${st}`, stage: st, cards: s.cards.filter((c) => c.stage === st) }));
  if (formOf(s) !== 'pairs') return s.cards.map((c) => ({ key: c.id, cards: [c] }));
  const units: Unit[] = [];
  const byPair = new Map<string, Unit>();
  for (const c of s.cards) {
    if (c.pair && byPair.has(c.pair)) {
      byPair.get(c.pair)!.cards.push(c);
      continue;
    }
    const u = { key: c.pair ?? c.id, cards: [c] };
    if (c.pair) byPair.set(c.pair, u);
    units.push(u);
  }
  // בתוך זוג: פנים קודם, השתקפות אחריהן
  units.forEach((u) => u.cards.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'face' ? -1 : 1)));
  return units;
}

const CARD = 5 / 7;

/**
 * מחשב פריסה שמכניסה את כל היחידות לשטח הגלוי בגודל המרבי:
 * בודק כל מספר עמודות ובוחר את זה שנותן את הקלף הגדול ביותר
 */
export function fitGrid(n: number, perUnit: number, W: number, H: number, gap: number, innerGap: number) {
  if (!n || W <= 0 || H <= 0) return { cols: 1, cardW: 0 };
  let best = { cols: 1, cardW: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const unitW = (W - gap * (cols - 1)) / cols;
    const byW = (unitW - innerGap * (perUnit - 1)) / perUnit;
    const byH = ((H - gap * (rows - 1)) / rows) * CARD;
    const cardW = Math.min(byW, byH);
    if (cardW > best.cardW) best = { cols, cardW };
  }
  return { cols: best.cols, cardW: Math.floor(Math.min(best.cardW, 300)) };
}
