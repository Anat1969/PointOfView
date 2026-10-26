// ממלא את תור faces_art_queue בקבוצות של 4 (לשליחה בגלים עם faces_art_dispatch)
import { COACH_SCENES, FACE_STYLE, COACH_STYLE, facePrompt } from './art-data.mjs';
const [kind = 'faces', from = '1', to = '999'] = process.argv.slice(2);
const items = kind === 'faces'
  ? Array.from({ length: 60 }, (_, i) => ({ kind: 'face', id: `starter-${i + 1}`, prompt: `${facePrompt(i)}. @S`, seed: 1000 + i }))
  : COACH_SCENES.map((scene, i) => ({ kind: 'coach', id: `coach-${i + 1}`, prompt: `${scene}. @S`, seed: 2000 + i }));
const pick = items.filter((_, i) => i + 1 >= Number(from) && i + 1 <= Number(to));
const esc = (s) => s.replace(/'/g, "''");
const rows = [];
// הסגנון נכתב פעם אחת ומוחלף ב-SQL, כדי שהפקודה תישאר קצרה
const style = kind === 'faces' ? FACE_STYLE : COACH_STYLE;
for (let i = 0; i < pick.length; i += 4) rows.push(`('${esc(JSON.stringify({ action: 'batch', items: pick.slice(i, i + 4) }))}')`);
console.log(`insert into faces_art_queue (body)\nselect replace(t, '@S', '${esc(style)}')::jsonb from (values\n${rows.join(',\n')}) v(t);`);
