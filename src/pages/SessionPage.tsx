import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { Deck } from '../components/Deck';
import { FlipCard } from '../components/SessionCardView';
import { drawCard, isBlank, reflectionDeck } from '../lib/deck';
import { confirmAction, toast } from '../lib/feedback';
import { go } from '../lib/router';
import { getState, setState, useStore } from '../lib/store';
import type { Session, SessionCard } from '../lib/types';
import { useFaceImages } from '../lib/useImages';
import { newSession } from './Home';

export function SessionPage({ id }: { id: string }) {
  const working = useStore((s) => s.working);
  const saved = useStore((s) => s.sessions.find((x) => x.id === id));
  const faces = useStore((s) => s.faces);
  const refl = useStore((s) => s.reflections);
  const urls = useFaceImages();

  // פתיחת סשן שמור לעריכה
  useEffect(() => {
    if (working?.id !== id && saved) setState({ working: structuredClone(saved) });
  }, [id, saved, working?.id]);

  const s = working?.id === id ? working : null;
  const dirty = useMemo(() => !s || !saved || JSON.stringify(s) !== JSON.stringify(saved), [s, saved]);

  if (!s) {
    return (
      <div className="page">
        <div className="empty">
          <h2>הסשן לא נמצא</h2>
          <p>ייתכן שנמחק, או שנפתח במכשיר אחר. הנתונים נשמרים במכשיר שבו נוצרו.</p>
          <div className="row center">
            <button className="btn solid" onClick={newSession}>
              סשן חדש
            </button>
            <a className="btn ghost" href="#/history">
              להיסטוריה
            </a>
          </div>
        </div>
      </div>
    );
  }

  const update = (patch: Partial<Session>) => setState({ working: { ...s, ...patch, updatedAt: Date.now() } });
  const updateCard = (cid: string, patch: Partial<SessionCard>) =>
    update({ cards: s.cards.map((c) => (c.id === cid ? { ...c, ...patch } : c)) });

  const usedFaces = s.cards.filter((c) => c.kind === 'face').length;
  const usedRefl = s.cards.filter((c) => c.kind === 'reflection').length;
  const reflTotal = reflectionDeck(refl).length;

  const draw = (kinds: SessionCard['kind'][]) => {
    const added: SessionCard[] = [];
    const temp = { ...s, cards: [...s.cards] };
    for (const k of kinds) {
      const c = drawCard(temp, k);
      if (c) {
        added.push(c);
        temp.cards.push(c);
      }
    }
    if (!added.length) return toast('אין קלפים פנויים בחפיסה', 'error');
    update({ cards: [...s.cards, ...added] });
  };

  const replace = (c: SessionCard) => {
    const next = drawCard(s, c.kind, [c.refId]);
    if (!next) return toast('אין קלף אחר פנוי להחלפה', 'error');
    update({ cards: s.cards.map((x) => (x.id === c.id ? { ...next, id: c.id, note: c.note } : x)) });
  };

  const removeCard = (c: SessionCard, i: number) =>
    confirmAction({
      title: `להסיר את קלף ${i + 1}?`,
      body: c.note ? 'גם ההערה שנכתבה לקלף תימחק.' : undefined,
      action: 'הסרה',
      onConfirm: () => update({ cards: s.cards.filter((x) => x.id !== c.id) }),
    });

  const save = () => {
    const list = getState().sessions;
    const exists = list.some((x) => x.id === s.id);
    setState({ sessions: exists ? list.map((x) => (x.id === s.id ? s : x)) : [s, ...list] });
    toast('הסשן נשמר');
  };

  const discard = () =>
    confirmAction({
      title: saved ? 'לבטל את השינויים?' : 'למחוק את הטיוטה?',
      body: saved ? 'הסשן יחזור לגרסה השמורה האחרונה.' : 'הטיוטה לא נשמרה בהיסטוריה ותימחק.',
      action: saved ? 'ביטול שינויים' : 'מחיקת טיוטה',
      onConfirm: () => {
        if (saved) setState({ working: structuredClone(saved) });
        else {
          setState({ working: null });
          go('/');
        }
      },
    });

  return (
    <div className="page session">
      <header className="session-head">
        <div className="session-title">
          <span className="label">
            סשן / {s.mode === 'group' ? 'קבוצתי' : 'אישי'} / {saved ? (dirty ? 'יש שינויים שלא נשמרו' : 'שמור') : 'טיוטה'}
          </span>
          <input className="title-input" aria-label="שם הסשן" value={s.title} onChange={(e) => update({ title: e.target.value })} />
        </div>
        <div className="session-meta">
          <div className="segmented" role="radiogroup" aria-label="סוג הסשן">
            {(['personal', 'group'] as const).map((m) => (
              <button key={m} role="radio" aria-checked={s.mode === m} className={s.mode === m ? 'on' : ''} onClick={() => update({ mode: m })}>
                {m === 'personal' ? 'אישי' : 'קבוצתי'}
                {s.mode === m && <motion.span layoutId="seg" className="seg-bg" />}
              </button>
            ))}
          </div>
          <input
            className="participants"
            aria-label={s.mode === 'group' ? 'משתתפים' : 'שם המשתתף'}
            placeholder={s.mode === 'group' ? 'משתתפים' : 'שם המשתתף'}
            value={s.participants}
            onChange={(e) => update({ participants: e.target.value })}
          />
        </div>
        <div className="session-actions">
          <button className="btn solid" onClick={save} disabled={!dirty}>
            {dirty ? 'שמירה' : 'נשמר'}
          </button>
          <button className="btn ghost" onClick={() => go(`/present/${s.id}`)} disabled={!s.cards.length}>
            תצוגת קבוצה
          </button>
          {(dirty || !saved) && (
            <button className="btn ghost" onClick={discard}>
              {saved ? 'ביטול שינויים' : 'מחיקת טיוטה'}
            </button>
          )}
        </div>
      </header>

      <section className="decks">
        <Deck
          kind="face"
          label="שליפת פנים"
          remaining={faces.length - usedFaces}
          total={faces.length}
          onDraw={() => draw(['face'])}
          disabledText={faces.length ? 'כל הפנים נשלפו' : undefined}
        />
        <motion.button className="btn pair" onClick={() => draw(['face', 'reflection'])} whileTap={{ scale: 0.95 }} disabled={faces.length - usedFaces === 0 && reflTotal - usedRefl === 0}>
          שליפת זוג
        </motion.button>
        <Deck
          kind="reflection"
          label="שליפת השתקפות"
          remaining={reflTotal - usedRefl}
          total={reflTotal}
          onDraw={() => draw(['reflection'])}
          disabledText={reflTotal ? 'כל ההשתקפויות נשלפו' : undefined}
        />
      </section>
      {(!faces.length || !reflTotal) && (
        <p className="empty-hint">
          {!faces.length && (
            <>
              ספריית הפנים ריקה. <a href="#/faces">להעלאת תמונות</a>.{' '}
            </>
          )}
          {!reflTotal && (
            <>
              אין השתקפויות. <a href="#/reflections">להזנת מילים</a>.
            </>
          )}
        </p>
      )}

      {s.cards.length === 0 ? (
        <div className="empty table-empty">
          <h2>השולחן ריק</h2>
          <p>הצעד הבא: ללחוץ על אחת החפיסות. כל קלף שנשלף מקבל מקום להערה.</p>
        </div>
      ) : (
        <motion.ol className="table" layout>
          <AnimatePresence>
            {s.cards.map((c, i) => (
              <motion.li
                key={c.id}
                layout
                className={`slot slot-${c.kind}`}
                exit={{ opacity: 0, rotateX: -70, y: 40, transition: { duration: 0.25 } }}
              >
                <FlipCard key={c.refId} card={c} url={c.kind === 'face' ? urls.get(c.refId) : undefined} index={i} />
                <div className="slot-body">
                  <div className="slot-head">
                    <span className="mono">
                      {String(i + 1).padStart(2, '0')} · {c.kind === 'face' ? 'פנים' : isBlank(c) ? 'קלף ריק' : 'השתקפות'}
                    </span>
                    <div className="row">
                      <button className="btn ghost xs" onClick={() => replace(c)}>
                        החלפה
                      </button>
                      <button className="btn ghost xs" onClick={() => removeCard(c, i)}>
                        הסרה
                      </button>
                    </div>
                  </div>
                  <textarea
                    aria-label={`הערה לקלף ${i + 1}`}
                    placeholder={isBlank(c) ? 'המילה שנבחרה, ומה עלה ממנה' : 'מה עלה מהקלף'}
                    value={c.note}
                    onChange={(e) => updateCard(c.id, { note: e.target.value })}
                    rows={3}
                  />
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ol>
      )}

      <section className="summary">
        <label htmlFor="summary" className="label">
          סיכום הסשן
        </label>
        <textarea id="summary" rows={4} placeholder="תובנה מרכזית, צעד הבא" value={s.summary} onChange={(e) => update({ summary: e.target.value })} />
      </section>
    </div>
  );
}
