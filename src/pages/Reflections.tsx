import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { LibraryNote } from '../components/LibraryNote';
import { confirmAction, toast } from '../lib/feedback';
import { addWords, deleteWord, renameWord, setBlanks } from '../lib/library';
import { getState, selectEditing, useStore } from '../lib/store';
import type { Word } from '../lib/types';
import { MAX_BLANKS, MAX_REFLECTIONS, MAX_WORDS } from '../lib/types';

function WordTile({ w, i, canEdit }: { w: Word; i: number; canEdit: boolean }) {
  const [value, setValue] = useState(w.text);
  const commit = () => {
    const v = value.trim();
    if (v === w.text) return;
    if (!v) {
      setValue(w.text);
      return;
    }
    renameWord(w.id, v);
  };
  return (
    <motion.li
      layout
      className="word-tile"
      initial={{ opacity: 0, rotateX: -80, y: 20 }}
      animate={{ opacity: 1, rotateX: 0, y: 0 }}
      exit={{ opacity: 0, rotateY: 80, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22, delay: Math.min(i, 20) * 0.015 }}
    >
      <span className="mono idx">{String(i + 1).padStart(2, '0')}</span>
      {canEdit ? (
        <>
          <input
            aria-label={`עריכת המילה ${w.text}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
          <button
            className="btn ghost xs"
            onClick={() =>
              confirmAction({
                title: `למחוק את "${w.text}"?`,
                body: 'המילה תוסר מהחפיסה המשותפת. סשנים שמורים לא ישתנו.',
                action: 'מחיקה',
                onConfirm: () => deleteWord(w.id),
              })
            }
            aria-label={`מחיקת ${w.text}`}
          >
            מחיקה
          </button>
        </>
      ) : (
        <span className="word-text">{w.text}</span>
      )}
    </motion.li>
  );
}

export function Reflections() {
  const { words, blanks } = useStore((s) => s.reflections);
  const canEdit = useStore(selectEditing);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    // אפשר להדביק כמה מילים בבת אחת, מופרדות בפסיק או בשורה
    const incoming = draft
      .split(/[,\n،]+/)
      .map((w) => w.trim())
      .filter(Boolean);
    if (!incoming.length) return setError('יש להזין מילה.');
    const existing = new Set(getState().reflections.words.map((w) => w.text));
    const fresh = [...new Set(incoming)].filter((w) => !existing.has(w));
    const room = MAX_WORDS - getState().reflections.words.length;
    if (!fresh.length) return setError('המילים כבר קיימות ברשימה.');
    if (room <= 0) return setError(`הרשימה מלאה: ${MAX_WORDS} מילים ועוד ${MAX_BLANKS} קלפים ריקים.`);
    setBusy(true);
    const added = await addWords(fresh);
    setBusy(false);
    if (!added) return;
    setDraft('');
    setError(fresh.length > room ? `נוספו ${added}. השאר לא נכנסו כי הרשימה מלאה.` : '');
    toast(added === 1 ? 'המילה נוספה' : `${added} מילים נוספו`);
  };

  const total = words.length + blanks;

  return (
    <div className="page">
      <header className="page-head">
        <span className="label">ספרייה / השתקפויות</span>
        <h1>ספריית השתקפויות</h1>
        <div className="meter refl" aria-label={`${total} מתוך ${MAX_REFLECTIONS}`}>
          <motion.span animate={{ width: `${(total / MAX_REFLECTIONS) * 100}%` }} />
        </div>
        <p className="mono">
          {words.length} / {MAX_WORDS} מילים · {blanks} / {MAX_BLANKS} ריקים · {total} / {MAX_REFLECTIONS}
        </p>
        <LibraryNote />
      </header>

      {canEdit && (
        <form
          className="word-form"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label htmlFor="word-input" className="label">
            מילה חדשה
          </label>
          <div className="row">
            <input
              id="word-input"
              value={draft}
              maxLength={400}
              onChange={(e) => {
                setDraft(e.target.value);
                setError('');
              }}
              placeholder="למשל: אומץ, געגוע, סקרנות"
            />
            <button className="btn solid" type="submit" disabled={busy || words.length >= MAX_WORDS}>
              {busy ? 'שומר...' : 'הוספה'}
            </button>
          </div>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}

      <section className="blanks">
        <div>
          <span className="label">קלפים ריקים</span>
          <p>קלף ריק בחפיסה: המשתתף בוחר את המילה בעצמו, והיא נכתבת בהערה.</p>
        </div>
        <div className="stepper" role="group" aria-label="מספר קלפים ריקים">
          {canEdit && (
            <button className="btn ghost sm" onClick={() => setBlanks(Math.max(0, blanks - 1))} disabled={blanks <= 0}>
              פחות
            </button>
          )}
          <span className="mono big">{blanks}</span>
          {canEdit && (
            <button className="btn ghost sm" onClick={() => setBlanks(Math.min(MAX_BLANKS, blanks + 1))} disabled={blanks >= MAX_BLANKS}>
              יותר
            </button>
          )}
        </div>
      </section>

      {words.length === 0 ? (
        <div className="empty">
          <h2>הרשימה ריקה</h2>
          <p>{canEdit ? `הצעד הבא: להזין את מילות ההשתקפות, עד ${MAX_WORDS} מילים. אפשר להדביק כמה מילים בבת אחת, מופרדות בפסיק.` : 'הרשימה עוד לא נטענה.'}</p>
        </div>
      ) : (
        <motion.ol className="word-grid" layout>
          <AnimatePresence>
            {words.map((w, i) => (
              <WordTile key={w.id} w={w} i={i} canEdit={canEdit} />
            ))}
          </AnimatePresence>
        </motion.ol>
      )}
    </div>
  );
}
