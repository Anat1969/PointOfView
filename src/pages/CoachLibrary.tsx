import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { LibraryNote } from '../components/LibraryNote';
import { Dictate } from '../components/Dictate';
import { Tilt } from '../components/Tilt';
import { COACH_COUNT } from '../lib/coach';
import { confirmAction, toast } from '../lib/feedback';
import { ACCEPTED, MAX_FILE_MB, prepareImage } from '../lib/images';
import { addCoachCard, deleteCoachCard, renameCoachCard, restoreCoachStarters } from '../lib/library';
import { getState, selectEditing, useStore } from '../lib/store';
import type { CoachCard } from '../lib/types';
import { MAX_COACH } from '../lib/types';
import { useFaceImages } from '../lib/useImages';

type UploadError = { file: string; reason: string };

function CardTile({ c, url, i, editing }: { c: CoachCard; url?: string; i: number; editing: boolean }) {
  const [word, setWord] = useState(c.word);
  const commit = () => {
    const v = word.trim();
    if (!v) return setWord(c.word);
    if (v !== c.word) renameCoachCard(c.id, v);
  };
  return (
    <motion.li
      layout
      initial={{ opacity: 0, rotateY: -70, scale: 0.9 }}
      animate={{ opacity: 1, rotateY: 0, scale: 1 }}
      exit={{ opacity: 0, rotateX: 60, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22, delay: Math.min(i, 20) * 0.02 }}
      style={{ perspective: 800 }}
    >
      <Tilt className="coach-tile">
        {url ? <img src={url} alt="" loading="lazy" /> : <div className="skeleton" />}
        <div className="coach-band">
          {editing ? (
            <>
              <input
                aria-label={`עריכת המילה ${c.word}`}
                value={word}
                onChange={(e) => setWord(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
              <Dictate
                label={`המילה ${c.word}`}
                onText={(t) => {
                  setWord(t);
                  renameCoachCard(c.id, t);
                }}
              />
            </>
          ) : (
            <span>{c.word}</span>
          )}
        </div>
        {editing && (
          <button
            className="btn ghost xs on-dark coach-del"
            aria-label={`מחיקת ${c.word}`}
            onClick={() =>
              confirmAction({
                title: `למחוק את הקלף "${c.word}"?`,
                body: c.starter ? 'הקלף יוסר מהספרייה המשותפת. אפשר להחזיר אותו בכל עת.' : 'התמונה תימחק מהספרייה המשותפת.',
                action: 'מחיקה',
                onConfirm: () => deleteCoachCard(c),
              })
            }
          >
            מחיקה
          </button>
        )}
      </Tilt>
    </motion.li>
  );
}

export function CoachLibrary() {
  const cards = useStore((s) => s.coachCards);
  const editing = useStore(selectEditing);
  const urls = useFaceImages();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [errors, setErrors] = useState<UploadError[]>([]);

  const upload = async (files: File[]) => {
    const errs: UploadError[] = [];
    let room = MAX_COACH - getState().coachCards.length;
    const valid: File[] = [];
    for (const f of files) {
      if (!ACCEPTED.includes(f.type)) errs.push({ file: f.name, reason: 'סוג קובץ לא נתמך. רק JPG או PNG.' });
      else if (f.size > MAX_FILE_MB * 1024 * 1024) errs.push({ file: f.name, reason: `הקובץ גדול מ-${MAX_FILE_MB}MB.` });
      else if (room <= 0) errs.push({ file: f.name, reason: `הספרייה מלאה: ${MAX_COACH} קלפים לכל היותר.` });
      else {
        valid.push(f);
        room--;
      }
    }
    setBusy(valid.length);
    let added = 0;
    for (const f of valid) {
      try {
        // המילה ההתחלתית היא שם הקובץ, ונערכת מיד על הקלף
        if (await addCoachCard(await prepareImage(f), f.name.replace(/\.[^.]+$/, ''))) added++;
        else errs.push({ file: f.name, reason: 'ההעלאה לספרייה המשותפת נכשלה. כדאי לנסות שוב.' });
      } catch {
        errs.push({ file: f.name, reason: 'לא הצלחתי לקרוא את התמונה. ייתכן שהקובץ פגום.' });
      }
      setBusy((b) => b - 1);
    }
    setErrors(errs);
    if (added) toast(added === 1 ? 'קלף אחד נוסף. אפשר לערוך את המילה עליו' : `${added} קלפים נוספו. אפשר לערוך את המילים`);
  };

  const starterMissing = COACH_COUNT - cards.filter((c) => c.starter).length;
  const full = cards.length >= MAX_COACH;

  return (
    <div className="page">
      <header className="page-head">
        <span className="label">משחק האימון / ספרייה</span>
        <h1>ספריית קלפים</h1>
        <div className="meter refl" aria-label={`${cards.length} מתוך ${MAX_COACH}`}>
          <motion.span animate={{ width: `${(cards.length / MAX_COACH) * 100}%` }} />
        </div>
        <p className="mono">
          {cards.length} / {MAX_COACH} · {cards.filter((c) => c.starter).length} איורי פתיחה · {cards.filter((c) => c.image_path).length} תמונות שהועלו
        </p>
        <LibraryNote />
      </header>

      {editing && (
        <div className={`dropzone ${full ? 'disabled' : ''}`}>
          <p>{full ? 'הספרייה מלאה.' : 'מעלים תמונה, ואז כותבים עליה את המילה של הקלף.'}</p>
          <div className="row wrap">
            {starterMissing > 0 && !full && (
              <button className="btn ghost" onClick={restoreCoachStarters}>
                החזרת קלפי הפתיחה ({starterMissing})
              </button>
            )}
            <button className="btn solid" disabled={full || busy > 0} onClick={() => input.current?.click()}>
              {busy > 0 ? `מעלה... נותרו ${busy}` : 'העלאת תמונות'}
            </button>
          </div>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            hidden
            data-testid="coach-input"
            onChange={(e) => {
              upload(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
        </div>
      )}

      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div className="error-panel" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="error-head">
              <strong>{errors.length === 1 ? 'קובץ אחד לא הועלה' : `${errors.length} קבצים לא הועלו`}</strong>
              <button className="btn ghost sm" onClick={() => setErrors([])}>
                סגירה
              </button>
            </div>
            <ul>
              {errors.map((e, i) => (
                <li key={i}>
                  <span className="mono">{e.file}</span> {e.reason}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {cards.length === 0 ? (
        <div className="empty">
          <h2>הספרייה ריקה</h2>
          <p>{editing ? `הצעד הבא: להחזיר את ${COACH_COUNT} קלפי הפתיחה, או להעלות תמונות.` : 'הספרייה עוד לא נטענה. אם אין חיבור, כדאי לנסות שוב בעוד רגע.'}</p>
          {editing && (
            <button className="btn solid" onClick={restoreCoachStarters}>
              טעינת קלפי הפתיחה
            </button>
          )}
        </div>
      ) : (
        <motion.ul className="face-grid" layout>
          <AnimatePresence>
            {cards.map((c, i) => (
              <CardTile key={c.id} c={c} url={urls.get(c.id)} i={i} editing={editing} />
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
