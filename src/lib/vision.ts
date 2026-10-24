// תמונת ההתחייבות: הסשן נשלח לפונקציה faces-vision, שבונה פרומפט ומחזירה תמונה קבועה בדלי
import { FOCUS_CARDS, STATIONS } from './coach';
import { MIRRORS, moodOf } from './facesJourney';
import { gameOf } from './games';
import { getState } from './store';
import { ANON_KEY, SUPABASE_URL, currentEditorKey, publicUrl } from './supa';
import type { Session } from './types';

export const visionUrl = (s: Session) => (s.vision?.path ? publicUrl(s.vision.path) : undefined);

/** שם העמדה לפי המשחק, לתצוגה ולפרומפט */
export function stationName(s: Session, i: number) {
  return gameOf(s) === 'coaching' ? STATIONS[i]?.name : MIRRORS[i]?.name;
}

/** מה שנשלח לשרת: רק תוכן הסשן, בלי מזהים אישיים */
export function visionPayload(s: Session, variant?: string) {
  const { faces } = getState();
  const game = gameOf(s);
  const cards = s.cards
    .filter((c) => c.stage !== undefined)
    .sort((a, b) => (a.stage! - b.stage!) || (a.kind === 'face' ? -1 : 1))
    .map((c) => ({
      position: stationName(s, c.stage!) ?? '',
      kind: c.kind === 'face' ? 'פנים' : c.kind === 'reflection' ? 'השתקפות' : 'תמונה ומילה',
      word: c.kind === 'face' ? '' : c.text ?? c.note.split('\n')[0],
      mood: c.kind === 'face' ? moodOf(faces.find((f) => f.id === c.refId)?.name) : '',
      note: c.note,
    }));
  const focus =
    s.focus === undefined ? '' : game === 'coaching' ? FOCUS_CARDS[s.focus] ?? '' : MIRRORS[s.focus]?.name ?? '';
  return { sessionId: s.id, game, topic: s.topic ?? '', cards, insight: s.insight ?? '', focus, action: s.action ?? {}, variant };
}

export type VisionResult = { path: string; distill: string; prompt: string; title?: string };

export async function requestVision(s: Session, variant?: string): Promise<VisionResult> {
  const key = currentEditorKey();
  if (!key) throw new Error('יצירת תמונה זמינה במכשיר שנכנס עם מפתח עריכה (לוגו A&I).');
  const r = await fetch(`${SUPABASE_URL}/functions/v1/faces-vision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'x-editor-key': key },
    body: JSON.stringify(visionPayload(s, variant)),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || !data?.path) throw new Error(data?.error ?? `יצירת התמונה נכשלה (${r.status})`);
  return data as VisionResult;
}
