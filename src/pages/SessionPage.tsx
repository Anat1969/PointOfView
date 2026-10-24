import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { CardFace } from '../components/CardFace';
import { FlipCard } from '../components/SessionCardView';
import { Dictate, appendText } from '../components/Dictate';
import { drawCard, isBlank, reflectionDeck } from '../lib/deck';
import { confirmAction, toast } from '../lib/feedback';
import { uid } from '../lib/id';
import { go } from '../lib/router';
import { getState, setState, useStore } from '../lib/store';
import type { GameId, Session, SessionCard } from '../lib/types';
import { GAMES } from '../lib/games';
import { Journey } from './Journey';
import { fitGrid, formOf, toUnits } from '../lib/units';
import { useFaceImages } from '../lib/useImages';
import { newSession } from './Home';


const INNER = 8;

/** גודל השטח הפנוי של השולחן, מתעדכן עם שינוי החלון */
function useBox<T extends HTMLElement>() {
  // ref כפונקציה: השולחן נוצר רק אחרי שהסשן נטען, ואז מתחילה המדידה
  const [el, ref] = useState<T | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [ref, box] as const;
}

function MiniDeck({ kind, label, left, onDraw }: { kind: 'face' | 'reflection' | 'pair' | 'coach'; label: string; left: number; onDraw: () => void }) {
  const empty = left <= 0;
  return (
    <motion.button
      className={`mini-deck mini-${kind}`}
      onClick={onDraw}
      disabled={empty}
      whileHover={empty ? undefined : { rotateX: 10, y: -4 }}
      whileTap={empty ? undefined : { scale: 0.95, rotateX: 20 }}
      aria-label={`${label}, נותרו ${left}`}
    >
      {[3, 2, 1].map((i) => (
        <span key={i} className="mini-layer" style={{ transform: `translateZ(${-i * 4}px) translateY(${i * 3}px)` }} />
      ))}
      <span className="mini-top">
        <span className="mini-title">{label}</span>
        <span className="mono">{empty ? 'החפיסה נגמרה' : `נותרו ${left}`}</span>
      </span>
    </motion.button>
  );
}

export function SessionPage({ id, game }: { id: string; game: GameId }) {
  const cfg = GAMES[game];
  const coach = useStore((s) => s.coachCards);
  const working = useStore((s) => s.working);
  const saved = useStore((s) => s.sessions.find((x) => x.id === id));
  const faces = useStore((s) => s.faces);
  const refl = useStore((s) => s.reflections);
  const urls = useFaceImages();
  const [selected, setSelected] = useState<string | null>(null);
  const [details, setDetails] = useState(false);
  const [boardRef, box] = useBox<HTMLDivElement>();

  useEffect(() => {
    if (working?.id !== id && saved) setState({ working: structuredClone(saved) });
  }, [id, saved, working?.id]);

  const s = working?.id === id ? working : null;
  const dirty = useMemo(() => !s || !saved || JSON.stringify(s) !== JSON.stringify(saved), [s, saved]);
  const units = useMemo(() => (s ? toUnits(s) : []), [s]);
  const form = s ? formOf(s) : cfg.defaultForm;
  const perUnit = form === 'pairs' ? 2 : 1;
  const GAP = box.w < 520 ? 10 : 18;
  const journeyForm = form === 'journey';
  const fit = fitGrid(units.length, perUnit, box.w, box.h, GAP, INNER);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (setSelected(null), setDetails(false));
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!s) {
    return (
      <div className="page">
        <div className="empty">
          <h2>הסשן לא נמצא</h2>
          <p>ייתכן שנמחק, או שנפתח במכשיר אחר. הסשנים נשמרים במכשיר שבו נוצרו.</p>
          <div className="row center">
            <button className="btn solid" onClick={() => newSession(game)}>
              סשן חדש
            </button>
            <a className="btn ghost" href={`#/${game}/history`}>
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

  const facesLeft = faces.length - s.cards.filter((c) => c.kind === 'face').length;
  const reflLeft = reflectionDeck(refl).length - s.cards.filter((c) => c.kind === 'reflection').length;
  const coachLeft = coach.length - s.cards.filter((c) => c.kind === 'coach').length;

  const draw = (kinds: SessionCard['kind'][]) => {
    const added: SessionCard[] = [];
    const temp = { ...s, cards: [...s.cards] };
    const pair = kinds.length > 1 ? uid() : undefined;
    for (const k of kinds) {
      const c = drawCard(temp, k);
      if (c) {
        if (pair) c.pair = pair;
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
    update({ cards: s.cards.map((x) => (x.id === c.id ? { ...next, id: c.id, pair: c.pair, stage: c.stage, note: c.note } : x)) });
  };

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
        setDetails(false);
        if (saved) setState({ working: structuredClone(saved) });
        else {
          setState({ working: null });
          go(`/${game}`);
        }
      },
    });

  const sel = s.cards.find((c) => c.id === selected) ?? null;
  const selIndex = sel ? s.cards.indexOf(sel) : -1;
  let order = 0;

  return (
    <div className="session-stage">
      <header className="stage-bar">
        <div className="voice-row stage-title-row">
          <input className="stage-title" aria-label="שם הסשן" value={s.title} onChange={(e) => update({ title: e.target.value })} />
          <Dictate label="שם הסשן" onText={(t) => update({ title: t })} />
        </div>
        <div className="segmented" role="radiogroup" aria-label="צורת המשחק">
          {cfg.forms.map((f) => (
            <button key={f.id} role="radio" aria-checked={form === f.id} className={form === f.id ? 'on' : ''} onClick={() => update({ form: f.id })}>
              {f.label}
              {form === f.id && <motion.span layoutId="form-seg" className="seg-bg" />}
            </button>
          ))}
        </div>
        <span className="mono stage-count">
          {units.length} {form === 'pairs' ? 'זוגות' : 'קלפים'} · {saved ? (dirty ? 'לא נשמר' : 'שמור') : 'טיוטה'}
        </span>
        <div className="stage-actions">
          <button className="btn ghost sm" onClick={() => (setDetails(true), setSelected(null))}>
            פרטים וסיכום
          </button>
          <button className="btn ghost sm" onClick={() => go(`/${game}/present/${s.id}`)} disabled={!s.cards.length}>
            תצוגת קבוצה
          </button>
          <button className="btn solid sm" onClick={save} disabled={!dirty}>
            {dirty ? 'שמירה' : 'נשמר'}
          </button>
        </div>
      </header>

      {/* החלונית מקבלת עמודה משלה: השולחן מצטמצם והקלפים מסתדרים מחדש, ושום קלף לא מוסתר */}
      <div className={`stage-body ${journeyForm ? 'journey-body' : ''} ${sel || details ? 'with-drawer' : ''}`}>
        {journeyForm ? (
          <Journey s={s} update={update} onSave={save} />
        ) : (
        <>
        <aside className="deck-rail" aria-label="חפיסות">
          {game === 'faces' ? (
            <>
              {form === 'pairs' && <MiniDeck kind="pair" label="שליפת זוג" left={Math.min(facesLeft, reflLeft)} onDraw={() => draw(['face', 'reflection'])} />}
              {form !== 'pairs' && <MiniDeck kind="face" label="שליפת פנים" left={facesLeft} onDraw={() => draw(['face'])} />}
              {form === 'free' && <MiniDeck kind="reflection" label="שליפת השתקפות" left={reflLeft} onDraw={() => draw(['reflection'])} />}
              {(!faces.length || (form !== 'faces' && !reflLeft && !s.cards.some((c) => c.kind === 'reflection'))) && (
                <p className="rail-hint">הספרייה עוד נטענת, או שהיא ריקה.</p>
              )}
            </>
          ) : (
            <>
              <MiniDeck kind="coach" label="שליפת קלף" left={coachLeft} onDraw={() => draw(['coach'])} />
              {!coach.length && <p className="rail-hint">הספרייה עוד נטענת, או שהיא ריקה.</p>}
            </>
          )}
        </aside>

        <div className="board" ref={boardRef}>
          {units.length === 0 ? (
            <div className="board-empty">
              <h2>השולחן ריק</h2>
              <p>{cfg.forms.find((f) => f.id === form)?.hint}</p>
            </div>
          ) : (
            <motion.ol
              className="board-grid"
              layout
              style={{ gridTemplateColumns: `repeat(${fit.cols}, auto)`, gap: GAP, ['--card-w' as string]: `${fit.cardW}px` }}
            >
              <AnimatePresence>
                {units.map((u) => (
                  <motion.li key={u.key} layout className={`unit ${u.cards.length > 1 ? 'unit-pair' : ''}`} exit={{ opacity: 0, scale: 0.8, rotateX: -50 }}>
                    {u.cards.map((c) => {
                      const i = order++;
                      return (
                        <button
                          key={c.id}
                          className={`table-card ${selected === c.id ? 'selected' : ''}`}
                          onClick={() => (setSelected(c.id), setDetails(false))}
                          aria-label={`קלף ${i + 1}, ${c.kind === 'face' ? 'פנים' : isBlank(c) ? 'קלף ריק' : c.text}. פתיחת הערה`}
                        >
                          <FlipCard key={c.refId} card={c} url={c.kind === 'reflection' ? undefined : urls.get(c.refId)} index={i} />
                        </button>
                      );
                    })}
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ol>
          )}
        </div>
        </>
        )}

        <AnimatePresence>
          {(sel || details) && (
            <motion.aside
              className="drawer"
              initial={{ opacity: 0, x: -30, rotateY: 14 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              aria-label={sel ? 'הערה לקלף' : 'פרטי הסשן'}
            >
              <div className="drawer-head">
                <span className="label">
                  {sel
                    ? `קלף ${selIndex + 1} · ${sel.kind === 'face' ? 'פנים' : sel.kind === 'coach' ? 'קלף אימון' : isBlank(sel) ? 'קלף ריק' : 'השתקפות'}`
                    : 'פרטי הסשן'}
                </span>
                <button className="btn ghost xs" onClick={() => (setSelected(null), setDetails(false))}>
                  סגירה
                </button>
              </div>
              {sel ? (
                <>
                  <div className="drawer-card">
                    <CardFace card={sel} url={sel.kind === 'reflection' ? undefined : urls.get(sel.refId)} />
                  </div>
                  <div className="voice-box">
                    <textarea
                      aria-label={`הערה לקלף ${selIndex + 1}`}
                      placeholder={isBlank(sel) ? 'המילה שנבחרה, ומה עלה ממנה. אפשר להקליד או להקליט' : 'מה עלה מהקלף. אפשר להקליד או להקליט'}
                      value={sel.note}
                      onChange={(e) => updateCard(sel.id, { note: e.target.value })}
                      rows={5}
                      autoFocus
                    />
                    <Dictate inside label="הערה" onText={(t) => updateCard(sel.id, { note: appendText(sel.note, t) })} />
                  </div>
                  <button className="btn ghost sm" onClick={() => replace(sel)}>
                    החלפת הקלף
                  </button>
                </>
              ) : (
                <>
                  <div className="segmented" role="radiogroup" aria-label="סוג הסשן">
                    {(['personal', 'group'] as const).map((m) => (
                      <button key={m} role="radio" aria-checked={s.mode === m} className={s.mode === m ? 'on' : ''} onClick={() => update({ mode: m })}>
                        {m === 'personal' ? 'אישי' : 'קבוצתי'}
                        {s.mode === m && <motion.span layoutId="mode-seg" className="seg-bg" />}
                      </button>
                    ))}
                  </div>
                  <div className="voice-row">
                    <input
                      aria-label={s.mode === 'group' ? 'משתתפים' : 'שם המשתתף'}
                      placeholder={s.mode === 'group' ? 'משתתפים' : 'שם המשתתף'}
                      value={s.participants}
                      onChange={(e) => update({ participants: e.target.value })}
                    />
                    <Dictate label={s.mode === "group" ? "משתתפים" : "שם המשתתף"} onText={(t) => update({ participants: appendText(s.participants, t) })} />
                  </div>
                  <label htmlFor="summary" className="label">
                    סיכום הסשן
                  </label>
                  <div className="voice-box">
                    <textarea id="summary" rows={6} placeholder="תובנה מרכזית, צעד הבא. אפשר להקליד או להקליט" value={s.summary} onChange={(e) => update({ summary: e.target.value })} />
                    <Dictate inside label="סיכום" onText={(t) => update({ summary: appendText(s.summary, t) })} />
                  </div>
                  {(dirty || !saved) && (
                    <button className="btn ghost sm danger-text" onClick={discard}>
                      {saved ? 'ביטול שינויים' : 'מחיקת טיוטה'}
                    </button>
                  )}
                </>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
