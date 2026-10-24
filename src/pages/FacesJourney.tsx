import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { CardFace } from '../components/CardFace';
import { Commit } from '../components/Commit';
import { Dictate, appendText } from '../components/Dictate';
import { VisionStep } from '../components/VisionStep';
import { isBlank, reflectionDeck } from '../lib/deck';
import { FACES_STEPS as STEPS, MIRRORS } from '../lib/facesJourney';
import { toast } from '../lib/feedback';
import { uid } from '../lib/id';
import { useStore } from '../lib/store';
import type { Session, SessionCard } from '../lib/types';
import { fitGrid } from '../lib/units';
import { useFaceImages } from '../lib/useImages';

function useBox() {
  const [el, ref] = useState<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [ref, box] as const;
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** מראה: זוג של פנים והשתקפות. ההשתקפות מתהפכת כשהיא נשלפת */
function Mirror({ i, face, refl, url, active, onClick }: { i: number; face?: SessionCard; refl?: SessionCard; url?: string; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" className={`mirror ${active ? 'active' : ''}`} onClick={onClick} disabled={!onClick} aria-label={`מראה ${i + 1}: ${MIRRORS[i].name}`}>
      <span className="map-label">
        <span className="mono">{String(i + 1).padStart(2, '0')}</span> {MIRRORS[i].name}
      </span>
      <span className="mirror-pair">
        <span className="map-card">
          {face ? (
            <motion.span className="map-flip" initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 110, damping: 15 }}>
              <span className="map-front">
                <CardFace card={face} url={url} />
              </span>
            </motion.span>
          ) : (
            <span className="map-empty">פנים</span>
          )}
        </span>
        <span className="map-card">
          {refl ? (
            <motion.span className="map-flip" initial={{ rotateY: 180 }} animate={{ rotateY: 0 }} transition={{ type: 'spring', stiffness: 80, damping: 13 }}>
              <span className="map-front">
                <CardFace card={refl} />
              </span>
              <span className="map-back back-refl" />
            </motion.span>
          ) : (
            <span className="map-empty">השתקפות</span>
          )}
        </span>
      </span>
    </button>
  );
}

export function FacesJourney({ s, update, onSave }: { s: Session; update: (p: Partial<Session>) => void; onSave: (patch?: Partial<Session>) => void }) {
  const faces = useStore((st) => st.faces);
  const refl = useStore((st) => st.reflections);
  const urls = useFaceImages();
  const step = s.step ?? 1;
  const faceAt = (i: number) => s.cards.find((c) => c.stage === i && c.kind === 'face');
  const reflAt = (i: number) => s.cards.find((c) => c.stage === i && c.kind === 'reflection');
  const pairs = [0, 1, 2].map((i) => ({ face: faceAt(i), refl: reflAt(i) }));
  const complete = pairs.every((p) => p.face && p.refl);
  const nextMirror = [0, 1, 2].find((i) => !pairs[i].face || !pairs[i].refl);
  const phase: 'face' | 'refl' | 'done' = nextMirror === undefined ? 'done' : pairs[nextMirror].face ? 'refl' : 'face';
  const [mirror, setMirror] = useState(0); // 0 עד 2 מראות, 3 התובנה
  const [spreadRef, box] = useBox();

  // פנים גלויות בסדר אקראי, השתקפויות הפוכות בסדר אקראי: נקבע פעם אחת לכל סשן
  const faceOrder = useMemo(() => shuffle(faces.map((f) => f.id)), [faces, s.id]);
  const reflOrder = useMemo(() => shuffle(reflectionDeck(refl).map((r) => r.refId)), [refl, s.id]);
  const used = new Set(s.cards.map((c) => c.refId));
  const openFaces = faceOrder.filter((id) => !used.has(id));
  const backs = reflOrder.filter((id) => !used.has(id));
  const spreadCount = phase === 'face' ? openFaces.length : backs.length;
  const fit = fitGrid(Math.max(1, spreadCount), 1, box.w, box.h, 6, 0);

  const go = (n: number) => update({ step: n });
  const canReach = (n: number) =>
    n === 1 || (n === 2 && !!s.topic?.trim()) || (n >= 3 && n <= 4 && complete) || (n === 5 && complete && !!s.action?.what?.trim());

  const pickFace = (id: string) => {
    if (phase !== 'face' || nextMirror === undefined) return;
    update({ cards: [...s.cards, { id: uid(), kind: 'face', refId: id, note: '', stage: nextMirror, pair: `m${nextMirror}` }] });
  };
  const pickRefl = (refId: string) => {
    if (phase !== 'refl' || nextMirror === undefined) return;
    const r = reflectionDeck(refl).find((x) => x.refId === refId);
    if (!r) return;
    update({ cards: [...s.cards, { id: uid(), kind: 'reflection', refId, text: r.text, note: '', stage: nextMirror, pair: `m${nextMirror}` }] });
  };
  const updateCard = (cid: string, patch: Partial<SessionCard>) => update({ cards: s.cards.map((c) => (c.id === cid ? { ...c, ...patch } : c)) });
  const action = s.action ?? { what: '', when: '', measure: '' };
  const setAction = (p: Partial<typeof action>) => update({ action: { ...action, ...p } });

  const row = (activeMirror?: number, clickable = false) => (
    <div className="mirrors" role="group" aria-label="שלוש המראות">
      {[0, 1, 2].map((i) => (
        <Mirror
          key={i}
          i={i}
          face={pairs[i].face}
          refl={pairs[i].refl}
          url={pairs[i].face ? urls.get(pairs[i].face!.refId) : undefined}
          active={activeMirror === i}
          onClick={clickable && pairs[i].face ? () => setMirror(i) : undefined}
        />
      ))}
    </div>
  );

  const cur = mirror < 3 ? pairs[mirror] : undefined;

  return (
    <div className="journey faces-journey">
      <ol className="steps" aria-label="שלבי התהליך">
        {STEPS.map((t, i) => (
          <li key={t}>
            <button type="button" className={`step-btn ${step === i + 1 ? 'on' : ''} ${step > i + 1 ? 'done' : ''}`} onClick={() => go(i + 1)} disabled={!canReach(i + 1)} aria-current={step === i + 1 ? 'step' : undefined}>
              <span className="mono">{String(i + 1).padStart(2, '0')}</span> {t}
            </button>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="popLayout">
        <motion.section
          key={step}
          className={`step-body step-${step}`}
          initial={{ opacity: 0, x: -30, rotateY: 8 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ type: 'spring', stiffness: 180, damping: 24 }}
        >
          {step === 1 && (
            <div className="topic">
              <span className="label">שלב 1 · הנושא</span>
              <h2>על מה תרצה להסתכל היום? שאלה, מצב או קשר.</h2>
              <p className="muted">למשל: איך אני נוכח בבית אחרי יום עבודה, או מה אני מרגיש מול השינוי בצוות.</p>
              <div className="voice-box">
                <textarea aria-label="הנושא" rows={4} placeholder="הנושא שלי. אפשר להקליד או להקליט" value={s.topic ?? ''} onChange={(e) => update({ topic: e.target.value })} />
                <Dictate inside label="נושא" onText={(t) => update({ topic: appendText(s.topic ?? '', t) })} />
              </div>
              <button className="btn solid" onClick={() => go(2)} disabled={!s.topic?.trim()}>
                המשך להנחת הזוגות
              </button>
            </div>
          )}

          {step === 2 && (
            <div className={`blind ${phase === 'done' ? 'all-placed' : ''}`}>
              <div className="blind-side">
                <span className="label">שלב 2 · הנחת הזוגות</span>
                <h2>
                  {phase === 'done'
                    ? 'שלושה זוגות על השולחן'
                    : phase === 'face'
                      ? MIRRORS[nextMirror!].pick
                      : `שלוף השתקפות הפוכה לפנים של "${MIRRORS[nextMirror!].name}"`}
                </h2>
                <p className="muted">
                  {phase === 'refl'
                    ? 'ההשתקפות נשלפת בעיוורון: לא בוחרים מילה, נותנים למילה לבחור אותך.'
                    : 'את הפנים בוחרים בגלוי: מסתכלים, ובוחרים את מה שמזהים בו את עצמך.'}
                </p>
                {row()}
                <div className="row wrap">
                  {complete && (
                    <button className="btn solid" onClick={() => (setMirror(0), go(3))}>
                      המשך לחקירת המראות
                    </button>
                  )}
                  {s.cards.length > 0 && (
                    <button className="btn ghost" onClick={() => update({ cards: [] })}>
                      החזרת הקלפים לחפיסה
                    </button>
                  )}
                </div>
              </div>
              {phase !== 'done' && (
              <div className="deck-spread" ref={spreadRef} aria-label={phase === 'face' ? 'פנים גלויות' : 'השתקפויות הפוכות'}>
                {phase === 'face' && (
                  <div className="spread-grid" style={{ gridTemplateColumns: `repeat(${fit.cols}, ${fit.cardW}px)` }}>
                    {openFaces.map((id) => (
                      <motion.button key={id} type="button" layout className="open-face" onClick={() => pickFace(id)} whileHover={{ y: -6, rotateX: 10, scale: 1.04 }} aria-label={`בחירת פנים ${faces.find((f) => f.id === id)?.name ?? ''}`}>
                        {urls.get(id) && <img src={urls.get(id)} alt="" draggable={false} />}
                      </motion.button>
                    ))}
                  </div>
                )}
                {phase === 'refl' && (
                  <div className="spread-grid" style={{ gridTemplateColumns: `repeat(${fit.cols}, ${fit.cardW}px)` }}>
                    {backs.map((id, k) => (
                      <motion.button key={id} type="button" layout className="back-card back-refl" onClick={() => pickRefl(id)} whileHover={{ y: -6, rotateX: 12 }} aria-label={`השתקפות הפוכה ${k + 1}`} />
                    ))}
                  </div>
                )}
              </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="stations">
              <div className="stations-map">
                <span className="label">שלב 3 · חקירת המראות ובניית התובנה</span>
                {row(mirror, true)}
                <div className="station-tabs" role="tablist" aria-label="מראות">
                  {[0, 1, 2].map((i) => (
                    <button key={i} role="tab" aria-selected={mirror === i} className={`btn sm ${mirror === i ? 'solid' : 'ghost'}`} onClick={() => setMirror(i)}>
                      מראה {i + 1}
                    </button>
                  ))}
                  <button role="tab" aria-selected={mirror === 3} className={`btn sm ${mirror === 3 ? 'solid' : 'ghost'}`} onClick={() => setMirror(3)}>
                    התובנה
                  </button>
                </div>
              </div>
              <div className="station-panel">
                {mirror < 3 && cur?.face ? (
                  <>
                    <span className="label">
                      מראה {mirror + 1} · {MIRRORS[mirror].name}
                    </span>
                    <h2>{MIRRORS[mirror].title}</h2>
                    <p className="muted">{MIRRORS[mirror].explain}</p>
                    <ul className="questions">
                      {MIRRORS[mirror].questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                    {cur.refl && isBlank(cur.refl) && (
                      <>
                        <label className="label" htmlFor="blank-word">
                          קלף ריק: איזו מילה היית כותב כאן?
                        </label>
                        <div className="voice-row">
                          <input id="blank-word" value={cur.refl.note.split('\n')[0]} onChange={(e) => updateCard(cur.refl!.id, { note: e.target.value })} placeholder="המילה שלך" />
                          <Dictate label="מילה" onText={(t) => updateCard(cur.refl!.id, { note: t })} />
                        </div>
                      </>
                    )}
                    <div className="voice-box">
                      <textarea
                        aria-label={`מה עולה במראה ${mirror + 1}`}
                        rows={3}
                        placeholder="מה עולה מהזוג הזה. אפשר להקליד או להקליט"
                        value={cur.face.note}
                        onChange={(e) => updateCard(cur.face!.id, { note: e.target.value })}
                      />
                      <Dictate inside label={`מראה ${mirror + 1}`} onText={(t) => updateCard(cur.face!.id, { note: appendText(cur.face!.note, t) })} />
                    </div>
                    <p className="example">
                      <span className="label">דוגמה</span> {MIRRORS[mirror].example}
                    </p>
                    <button className="btn solid" onClick={() => setMirror(mirror + 1)}>
                      {mirror < 2 ? `למראה ${mirror + 2}` : 'בניית התובנה'}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="label">התובנה</span>
                    <h2>מה שלוש המראות אומרות יחד?</h2>
                    <ol className="station-notes">
                      {[0, 1, 2].map((i) => (
                        <li key={i}>
                          <strong>{MIRRORS[i].name}:</strong> {pairs[i].face?.note || <span className="muted">עוד לא נכתב</span>}
                        </li>
                      ))}
                    </ol>
                    <div className="voice-box">
                      <textarea aria-label="התובנה" rows={3} placeholder="למשל: הפנים שאני מסתיר הן בדיוק הכוח שחסר לפנים שאני רוצה לפגוש" value={s.insight ?? ''} onChange={(e) => update({ insight: e.target.value })} />
                      <Dictate inside label="תובנה" onText={(t) => update({ insight: appendText(s.insight ?? '', t) })} />
                    </div>
                    <button className="btn solid" onClick={() => go(4)}>
                      המשך למנוף לפעולה
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="lever">
              <div className="lever-cards">
                <span className="label">שלב 4 · מנוף לפעולה</span>
                {s.insight && <blockquote className="insight-quote">{s.insight}</blockquote>}
                <h2>עם אילו פנים תצא לפעולה?</h2>
                <div className="companion-grid" role="radiogroup" aria-label="הפנים שילוו את הפעולה">
                  {[0, 1, 2].map((i) => (
                    <motion.button key={i} type="button" role="radio" aria-checked={s.focus === i} className={`companion ${s.focus === i ? 'on' : ''}`} onClick={() => update({ focus: i })} whileHover={{ y: -4, rotateX: 8 }}>
                      <span className="companion-card">{pairs[i].face && <CardFace card={pairs[i].face!} url={urls.get(pairs[i].face!.refId)} />}</span>
                      <span className="companion-name">{MIRRORS[i].name}</span>
                      {pairs[i].refl && <span className="mono">{isBlank(pairs[i].refl!) ? pairs[i].refl!.note.split('\n')[0] || 'קלף ריק' : pairs[i].refl!.text}</span>}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div className="commit">
                <span className="label">ההתחייבות</span>
                <h2>{s.focus !== undefined ? `צעד אחד, עם ${MIRRORS[s.focus].name}` : 'פעולה קונקרטית, מדידה ותחומה בזמן'}</h2>
                <Commit action={action} setAction={setAction} />
                <button
                  className="btn solid"
                  onClick={() => {
                    if (s.focus === undefined) return toast('כדאי לבחור קודם את הפנים שילוו את הפעולה', 'error');
                    if (!action.what.trim()) return toast('כדאי לכתוב קודם מה תעשה', 'error');
                    onSave({ step: 5 });
                  }}
                >
                  שמירה והמשך לתמונת ההתחייבות
                </button>
              </div>
            </div>
          )}

          {step === 5 && <VisionStep s={s} onSave={onSave} />}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
