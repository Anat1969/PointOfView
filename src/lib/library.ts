// הספריות המשותפות ב-Supabase (פרויקט cultura-GH, טבלאות faces_*)
import { toast } from './feedback';
import { uid } from './id';
import { starterFaces } from './starter';
import { getState, setState } from './store';
import { BUCKET, supa } from './supa';
import { coachStarterCards } from './coach';
import type { CoachCard, Face, Word } from './types';
import { MAX_COACH, MAX_FACES, MAX_WORDS } from './types';

export async function loadLibrary() {
  const [f, w, s, e, c] = await Promise.all([
    supa.from('faces_faces').select('id,name,image_path,starter,sort').order('sort').order('created_at'),
    supa.from('faces_words').select('id,text,sort').order('sort').order('created_at'),
    supa.from('faces_settings').select('blanks').eq('id', 1).maybeSingle(),
    supa.rpc('faces_can_edit'),
    supa.from('faces_coach_cards').select('id,word,image_path,starter,sort').order('sort').order('created_at'),
  ]);
  if (f.error || w.error || s.error || c.error) {
    setState({ sync: 'offline', canEdit: false });
    return;
  }
  setState({
    faces: f.data as Face[],
    reflections: { words: w.data as Word[], blanks: s.data?.blanks ?? 8 },
    coachCards: c.data as CoachCard[],
    canEdit: e.data === true,
    sync: 'ready',
  });
}

function failed(err: unknown) {
  console.warn(err);
  toast('השמירה נכשלה. הספרייה נטענת מחדש', 'error');
  loadLibrary();
}

const nextSort = (items: { sort?: number }[]) => items.reduce((m, x) => Math.max(m, x.sort ?? 0), 0) + 1;

export async function addFaceImage(blob: Blob, name: string): Promise<boolean> {
  const id = uid();
  const path = `faces/${id}.jpg`;
  const up = await supa.storage.from(BUCKET).upload(path, await blob.arrayBuffer(), { contentType: 'image/jpeg' });
  if (up.error) return false;
  const face: Face = { id, name, image_path: path, starter: null, sort: nextSort(getState().faces) };
  const ins = await supa.from('faces_faces').insert(face);
  if (ins.error) {
    await supa.storage.from(BUCKET).remove([path]);
    return false;
  }
  setState({ faces: [...getState().faces, face] });
  return true;
}

export async function deleteFace(face: Face) {
  const prev = getState().faces;
  setState({ faces: prev.filter((f) => f.id !== face.id) });
  const del = await supa.from('faces_faces').delete().eq('id', face.id);
  if (del.error) return failed(del.error);
  if (face.image_path) await supa.storage.from(BUCKET).remove([face.image_path]);
  toast('הפנים נמחקו');
}

/** משלים דיוקנאות מערכת הפתיחה שנמחקו, כל עוד יש מקום */
export async function restoreStarterFaces() {
  const have = new Set(getState().faces.map((f) => f.id));
  const room = MAX_FACES - getState().faces.length;
  const missing = starterFaces().filter((f) => !have.has(f.id)).slice(0, room);
  if (!missing.length) return toast('כל ערכת הפתיחה כבר בספרייה');
  const ins = await supa.from('faces_faces').insert(missing);
  if (ins.error) return failed(ins.error);
  await loadLibrary();
  toast(`${missing.length} דיוקנאות הוחזרו`);
}

export async function addWords(texts: string[]): Promise<number> {
  const { words } = getState().reflections;
  const room = MAX_WORDS - words.length;
  const base = nextSort(words);
  const rows: Word[] = texts.slice(0, room).map((text, i) => ({ id: uid(), text, sort: base + i }));
  if (!rows.length) return 0;
  const ins = await supa.from('faces_words').insert(rows);
  if (ins.error) {
    failed(ins.error);
    return 0;
  }
  setState({ reflections: { ...getState().reflections, words: [...getState().reflections.words, ...rows] } });
  return rows.length;
}

export async function renameWord(id: string, text: string) {
  const r = getState().reflections;
  setState({ reflections: { ...r, words: r.words.map((w) => (w.id === id ? { ...w, text } : w)) } });
  const up = await supa.from('faces_words').update({ text }).eq('id', id);
  if (up.error) failed(up.error);
}

export async function deleteWord(id: string) {
  const r = getState().reflections;
  setState({ reflections: { ...r, words: r.words.filter((w) => w.id !== id) } });
  const del = await supa.from('faces_words').delete().eq('id', id);
  if (del.error) return failed(del.error);
  toast('המילה נמחקה');
}

export async function setBlanks(blanks: number) {
  setState({ reflections: { ...getState().reflections, blanks } });
  const up = await supa.from('faces_settings').update({ blanks }).eq('id', 1);
  if (up.error) failed(up.error);
}

// ---------- משחק האימון ----------

export async function addCoachCard(blob: Blob, word: string): Promise<boolean> {
  const id = uid();
  const path = `coach/${id}.jpg`;
  const up = await supa.storage.from(BUCKET).upload(path, await blob.arrayBuffer(), { contentType: 'image/jpeg' });
  if (up.error) return false;
  const card: CoachCard = { id, word, image_path: path, starter: null, sort: nextSort(getState().coachCards) };
  const ins = await supa.from('faces_coach_cards').insert(card);
  if (ins.error) {
    await supa.storage.from(BUCKET).remove([path]);
    return false;
  }
  setState({ coachCards: [...getState().coachCards, card] });
  return true;
}

export async function renameCoachCard(id: string, word: string) {
  setState({ coachCards: getState().coachCards.map((c) => (c.id === id ? { ...c, word } : c)) });
  const up = await supa.from('faces_coach_cards').update({ word }).eq('id', id);
  if (up.error) failed(up.error);
}

export async function deleteCoachCard(card: CoachCard) {
  setState({ coachCards: getState().coachCards.filter((c) => c.id !== card.id) });
  const del = await supa.from('faces_coach_cards').delete().eq('id', card.id);
  if (del.error) return failed(del.error);
  if (card.image_path) await supa.storage.from(BUCKET).remove([card.image_path]);
  toast('הקלף נמחק');
}

/** משלים קלפי פתיחה שנמחקו, כל עוד יש מקום */
export async function restoreCoachStarters() {
  const have = new Set(getState().coachCards.map((c) => c.id));
  const room = MAX_COACH - getState().coachCards.length;
  const missing = coachStarterCards().filter((c) => !have.has(c.id)).slice(0, room);
  if (!missing.length) return toast('כל ערכת הפתיחה כבר בספרייה');
  const ins = await supa.from('faces_coach_cards').insert(missing);
  if (ins.error) return failed(ins.error);
  await loadLibrary();
  toast(`${missing.length} קלפים הוחזרו`);
}
