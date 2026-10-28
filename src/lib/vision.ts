// תמונת ההתחייבות: הסשן נשלח לפונקציה faces-vision, שבונה פרומפט ומחזירה תמונה קבועה בדלי
import { FOCUS_CARDS, STATIONS } from './coach';
import { MIRRORS, moodOf } from './facesJourney';
import { gameOf } from './games';
import { getState } from './store';
import { prepareImage } from './images';
import { ANON_KEY, BUCKET, SUPABASE_URL, publicUrl, supa } from './supa';
import type { Session } from './types';

export const visionUrl = (s: Session) => (s.vision?.path ? publicUrl(s.vision.path) : undefined);

/** שם העמדה לפי המשחק, לתצוגה ולפרומפט */
export function stationName(s: Session, i: number) {
  return gameOf(s) === 'coaching' ? STATIONS[i]?.name : MIRRORS[i]?.name;
}

/** מה שנשלח לשרת: רק תוכן הסשן, בלי מזהים אישיים */
export function visionPayload(s: Session, variant?: string, mode?: 'prompt') {
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
  return { sessionId: s.id, game, topic: s.topic ?? '', cards, insight: s.insight ?? '', focus, action: s.action ?? {}, variant, mode };
}

export type VisionResult = { path: string | null; distill: string; prompt: string; promptEn?: string; title?: string; imageError?: string };

/** בונה פרומפט ותמונה במנועים חינמיים. הפרומפט חוזר תמיד, גם כשהתמונה לא נוצרה (imageError) */
export async function requestVision(s: Session, variant?: string, mode?: 'prompt'): Promise<VisionResult> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/faces-vision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify(visionPayload(s, variant, mode)),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || !data?.prompt) throw new Error(data?.error ?? `בניית הפרומפט נכשלה (${r.status})`);
  return data as VisionResult;
}

/** תמונה שיצרת בעצמך (למשל במידג'רני מהפרומפט) נכנסת למסגרת הכרטיס */
export async function uploadOwnVision(s: Session, file: File): Promise<string> {
  const blob = await prepareImage(file);
  const path = `visions/own-${s.id}-${Date.now()}.jpg`;
  const up = await supa.storage.from(BUCKET).upload(path, await blob.arrayBuffer(), { contentType: 'image/jpeg' });
  if (up.error) throw new Error('העלאת התמונה נכשלה');
  return path;
}
