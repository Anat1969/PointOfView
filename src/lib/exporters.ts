import type { Session } from './types';
import { getState } from './store';
import { isBlank } from './deck';
import { GAMES, gameOf } from './games';
import { FOCUS_CARDS, STATIONS } from './coach';

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function cardLabel(c: Session['cards'][number]): string {
  if (c.kind === 'coach') return c.text ?? '';
  if (c.kind === 'face') {
    return getState().faces.find((f) => f.id === c.refId)?.name ?? 'פנים שנמחקו';
  }
  return isBlank(c) ? 'קלף ריק' : c.text ?? '';
}

const stamp = () => new Date().toISOString().slice(0, 10);
// שם קובץ באנגלית: חלק מהדפדפנים מחליפים שם בעברית ב-"download"
const fileName = (sessions: Session[]) =>
  sessions.length === 1
    ? `faces-session-${new Date(sessions[0].createdAt).toISOString().slice(0, 10)}-${sessions[0].id.slice(-6)}`
    : `faces-sessions-${stamp()}`;

export function exportJSON(sessions: Session[]) {
  const data = sessions.map((s) => ({
    ...s,
    cards: s.cards.map((c) => ({ ...c, label: cardLabel(c) })),
  }));
  const name = fileName(sessions);
  download(`${name}.json`, JSON.stringify(data, null, 2), 'application/json');
}

const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export function exportCSV(sessions: Session[]) {
  const head = ['סשן', 'משחק', 'תאריך', 'סוג', 'משתתפים', 'מספר', 'שלב', 'סוג קלף', 'תוכן', 'הערה'];
  // שורות של תהליך משחק האימון: נושא, תובנה, כרטיס מיקוד והתחייבות
  const extra = (s: Session) => {
    const base = [s.title, GAMES[gameOf(s)].name, new Date(s.createdAt).toLocaleDateString('he-IL'), s.mode === 'group' ? 'קבוצתי' : 'אישי', s.participants, ''];
    const out: (string | number)[][] = [];
    if (s.topic) out.push([...base, 'נושא', '', '', s.topic]);
    if (s.insight) out.push([...base, 'תובנה', '', '', s.insight]);
    if (s.focus !== undefined) out.push([...base, 'מנוף לפעולה', 'כרטיס מיקוד', FOCUS_CARDS[s.focus] ?? '', '']);
    if (s.action?.what) out.push([...base, 'מנוף לפעולה', 'התחייבות', s.action.what, `מתי: ${s.action.when} · איך אדע: ${s.action.measure}`]);
    return out;
  };
  const rows = sessions.flatMap((s) => [
    ...s.cards.map((c, i) => [
      s.title,
      GAMES[gameOf(s)].name,
      new Date(s.createdAt).toLocaleDateString('he-IL'),
      s.mode === 'group' ? 'קבוצתי' : 'אישי',
      s.participants,
      i + 1,
      c.stage !== undefined && STATIONS[c.stage] ? STATIONS[c.stage].name : '',
      c.kind === 'face' ? 'פנים' : c.kind === 'coach' ? 'קלף אימון' : 'השתקפות',
      cardLabel(c),
      c.note,
    ]),
    ...extra(s),
  ]);
  const csv = '﻿' + [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  const name = fileName(sessions);
  download(`${name}.csv`, csv, 'text/csv;charset=utf-8');
}
