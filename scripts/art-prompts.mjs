// פרומפטים לערכות הפתיחה: 60 דיוקנאות לפנים ו-65 תמונות לקלפי האימון. מקוריים.
// הרצה: node scripts/art-prompts.mjs [faces|coach] [from] [to]
// מדפיס SQL שמזמין את faces-art דרך faces_art_call (pg_net). APPLY=0 מייצר בלי להחליף את הקלף.
import { COACH_SCENES, FACE_STYLE, COACH_STYLE, facePrompt } from './art-data.mjs';

const [kind = 'faces', from = '1', to = '999'] = process.argv.slice(2);
const items = kind === 'faces'
  ? Array.from({ length: 60 }, (_, i) => ({ kind: 'face', id: `starter-${i + 1}`, prompt: `${facePrompt(i)}. ${FACE_STYLE}`, seed: 1000 + i }))
  : COACH_SCENES.map((scene, i) => ({ kind: 'coach', id: `coach-${i + 1}`, prompt: `${scene}. ${COACH_STYLE}`, seed: 2000 + i }));
if (process.env.APPLY === '0') items.forEach((it) => (it.apply = false));
const pick = items.filter((_, i) => i + 1 >= Number(from) && i + 1 <= Number(to));
const esc = (s) => s.replace(/'/g, "''");
// קבוצות של 4 לכל הפעלה: הפונקציה מציירת אחת אחרי השנייה, כדי שעליות קרות לא יתנגשו
const groups = [];
for (let i = 0; i < pick.length; i += 4) groups.push(pick.slice(i, i + 4));
console.log(`select ${groups.map((g, k) => `faces_art_call('${esc(JSON.stringify({ action: 'batch', items: g }))}'::jsonb) g${k}`).join(',\n')};`);
