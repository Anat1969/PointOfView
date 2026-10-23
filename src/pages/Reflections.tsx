import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { confirmAction, toast } from '../lib/feedback';
import { uid } from '../lib/id';
import { getState, setState, useStore } from '../lib/store';
import { MAX_BLANKS, MAX_REFLECTIONS, MAX_WORDS } from '../lib/types';

export function Reflections() {
  const { words, blanks } = useStore((s) => s.reflections);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const save = (patch: Partial<{ words: typeof words; blanks: number }>) =>
    setState({ reflections: { ...getState().reflections, ...patch } });

  const add = () => {
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
    const taken = fresh.slice(0, room);
    save({ words: [...getState().reflections.words, ...taken.map((text) => ({ id: uid(), text }))] });
    setDraft('');
    setError(fresh.length > room ? `נוספו ${taken.length}. השאר לא נכנסו כי הרשימה מלאה.` : '');
    toast(taken.length === 1 ? 'המילה נוספה' : `${taken.length} מילים נוספו`);
  };

  const rename = (id: string, text: string) =>
    save({ words: getState().reflections.words.map((w) => (w.id === id ? { ...w, text } : w)) });

  const remove = (id: string, text: string) =>
    confirmAction({
      title: `למחוק את "${text}"?`,
      body: 'המילה תוסר מהחפיסה. סשנים שמורים לא ישתנו.',
      action: 'מחיקה',
      onConfirm: () => {
        save({ words: getState().reflections.words.filter((w) => w.id !== id) });
        toast('המילה נמחקה');
      },
    });

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
      </header>

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
          <button className="btn solid" type="submit" disabled={words.length >= MAX_WORDS}>
            הוספה
          </button>
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </form>

      <section className="blanks">
        <div>
          <span className="label">קלפים ריקים</span>
          <p>קלף ריק בחפיסה: המשתתף בוחר את המילה בעצמו, והיא נכתבת בהערה.</p>
        </div>
        <div className="stepper" role="group" aria-label="מספר קלפים ריקים">
          <button className="btn ghost sm" onClick={() => save({ blanks: Math.max(0, blanks - 1) })} disabled={blanks <= 0} aria-label="פחות">
            פחות
          </button>
          <span className="mono big">{blanks}</span>
          <button className="btn ghost sm" onClick={() => save({ blanks: Math.min(MAX_BLANKS, blanks + 1) })} disabled={blanks >= MAX_BLANKS} aria-label="יותר">
            יותר
          </button>
        </div>
      </section>

      {words.length === 0 ? (
        <div className="empty">
          <h2>הרשימה ריקה</h2>
          <p>
            הצעד הבא: להזין את מילות ההשתקפות, עד {MAX_WORDS} מילים. אפשר להדביק כמה מילים בבת אחת, מופרדות בפסיק.
          </p>
        </div>
      ) : (
        <motion.ol className="word-grid" layout>
          <AnimatePresence>
            {words.map((w, i) => (
              <motion.li
                key={w.id}
                layout
                className="word-tile"
                initial={{ opacity: 0, rotateX: -80, y: 20 }}
                animate={{ opacity: 1, rotateX: 0, y: 0 }}
                exit={{ opacity: 0, rotateY: 80, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 220, damping: 22, delay: Math.min(i, 20) * 0.015 }}
              >
                <span className="mono idx">{String(i + 1).padStart(2, '0')}</span>
                <input
                  aria-label={`עריכת המילה ${w.text}`}
                  value={w.text}
                  onChange={(e) => rename(w.id, e.target.value)}
                  onBlur={(e) => !e.target.value.trim() && remove(w.id, w.text || 'מילה ריקה')}
                />
                <button className="btn ghost xs" onClick={() => remove(w.id, w.text)} aria-label={`מחיקת ${w.text}`}>
                  מחיקה
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ol>
      )}
    </div>
  );
}
