import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { CardFace } from '../components/CardFace';
import { Dictate, appendText } from '../components/Dictate';
import { FOCUS_CARDS, INSPIRATION, MAP_ORDER, STATIONS } from '../lib/coach';
import { toast } from '../lib/feedback';
import { uid } from '../lib/id';
import { useStore } from '../lib/store';
import type { Session, SessionCard } from '../lib/types';
import { fitGrid } from '../lib/units';
import { useFaceImages } from '../lib/useImages';

const STEPS = ['הגדרת הנושא', 'בחירה עיוורת', 'חקירת התחנות', 'מנוף לפעולה'];

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

/** קלף במפה: הפוך עד שהופכים את שלושתם, ואז מתהפך בתלת־ממד */
function MapCard({ card, flipped, url, active, onClick, index }: { card?: SessionCard; flipped: boolean; url?: string; active?: boolean; onClick?: () => void; index: number }) {
  const st = STATIONS[index];
  return (
    <button type="button" className={`map-slot ${card ? 'filled' : ''} ${active ? 'active' : ''}`} onClick={onClick} disabled={!onClick} aria-label={`עמדה ${index + 1}: ${st.name}`}>
      <span className="map-label">
        <span className="mono">{String(index + 1).padStart(2, '0')}</span> {st.name}
      </span>
      <span className="map-card">
        {card ? (
          <motion.span className="map-flip" initial={false} animate={{ rotateY: flipped ? 0 : 180 }} transition={{ type: 'spring', stiffness: 90, damping: 14, delay: flipped ? index * 0.25 : 0 }}>
            <span className="map-front">
              <CardFace card={card} url={url} />
            </span>
            <span className="map-back back-coach" />
          </motion.span>
        ) : (
          <span className="map-empty">עמדה פנויה</span>
        )}
      </span>
    </button>
  );
}

export function Journey({ s, update, onSave }: { s: Session; update: (p: Partial<Session>) => void; onSave: () => void }) {
  const coach = useStore((st) => st.coachCards);
  const urls = useFaceImages();
  const step = s.step ?? 1;
  const byStation = (i: number) => s.cards.find((c) => c.stage === i);
  const chosen = [0, 1, 2].map(byStation);
  const allChosen = chosen.every(Boolean);
  const flipped = !!s.flipped && allChosen;
  const [station, setStation] = useState(0); // 0 עד 2 תחנות, 3 בניית התובנה
  const [deckRef, deckBox] = useBox();

  // סדר הקלפים ההפוכים נקבע אקראית פעם אחת לכל סשן: הבחירה עיוורת באמת
  const deckOrder = useMemo(() => shuffle(coach.map((c) => c.id)), [coach, s.id]);
  const used = new Set(s.cards.map((c) => c.refId));
  const backs = deckOrder.filter((id) => !used.has(id));
  const deckFit = fitGrid(Math.max(1, backs.length), 1, deckBox.w, deckBox.h, 6, 0);

  const go = (n: number) => update({ step: n });
  const canReach = (n: number) => n === 1 || (n === 2 && !!s.topic?.trim()) || (n >= 3 && flipped);

  const pick = (id: string) => {
    if (allChosen) return;
    const card = coach.find((c) => c.id === id);
    if (!card) return;
    const next = [0, 1, 2].find((i) => !byStation(i))!;
    update({ cards: [...s.cards, { id: uid(), kind: 'coach', refId: id, text: card.word, note: '', stage: next }] });
  };
  const updateCard = (cid: string, patch: Partial<SessionCard>) => update({ cards: s.cards.map((c) => (c.id === cid ? { ...c, ...patch } : c)) });
  const action = s.action ?? { what: '', when: '', measure: '' };
  const setAction = (p: Partial<typeof action>) => update({ action: { ...action, ...p } });

  const cur = station < 3 ? chosen[station] : undefined;
  const map = (activeStation?: number, clickable = false) => (
    <div className="map" role="group" aria-label="מפת שלוש התחנות">
      {MAP_ORDER.map((i) => (
        <MapCard
          key={i}
          index={i}
          card={chosen[i]}
          flipped={flipped}
          url={chosen[i] ? urls.get(chosen[i]!.refId) : undefined}
          active={activeStation === i}
          onClick={clickable && chosen[i] ? () => setStation(i) : undefined}
        />
      ))}
    </div>
  );

  return (
    <div className="journey">
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
              <span className="label">שלב 1 · הגדרת הנושא ומיקוד</span>
              <h2>בחר נושא אחד בחייך שבו אתה מרגיש תקוע, או שבו אתה רוצה בהירות.</h2>
              <p className="muted">למשל: היחסים עם השותף בעסק, או הפחד לפתוח עסק עצמאי.</p>
              <div className="voice-box">
                <textarea aria-label="הנושא" rows={4} placeholder="הנושא שלי. אפשר להקליד או להקליט" value={s.topic ?? ''} onChange={(e) => update({ topic: e.target.value })} />
                <Dictate inside label="נושא" onText={(t) => update({ topic: appendText(s.topic ?? '', t) })} />
              </div>
              <button className="btn solid" onClick={() => go(2)} disabled={!s.topic?.trim()}>
                המשך לבחירת הקלפים
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="blind">
              <div className="blind-side">
                <span className="label">שלב 2 · בחירה עיוורת</span>
                <h2>{allChosen ? (flipped ? 'הקלפים גלויים' : 'שלושה קלפים במפה. אפשר להפוך') : `שלוף קלף לעמדה ${[0, 1, 2].find((i) => !chosen[i])! + 1}: ${STATIONS[[0, 1, 2].find((i) => !chosen[i])!].name}`}</h2>
                <p className="muted">הקלפים הפוכים, התמונה כלפי מטה. בוחרים בלי לחשוב, לפי תחושה. רק אחרי שלושה קלפים הופכים.</p>
                {map()}
                <div className="row wrap">
                  {allChosen && !flipped && (
                    <button className="btn solid" onClick={() => update({ flipped: true })}>
                      הפיכת הקלפים
                    </button>
                  )}
                  {flipped && (
                    <button className="btn solid" onClick={() => (setStation(0), go(3))}>
                      המשך לחקירת התחנות
                    </button>
                  )}
                  {s.cards.length > 0 && !flipped && (
                    <button className="btn ghost" onClick={() => update({ cards: [], flipped: false })}>
                      החזרת הקלפים לחפיסה
                    </button>
                  )}
                </div>
              </div>
              <div className="deck-spread" ref={deckRef} aria-label="קלפים הפוכים">
                <div className="spread-grid" style={{ gridTemplateColumns: `repeat(${deckFit.cols}, ${deckFit.cardW}px)` }}>
                  {backs.map((id, k) => (
                    <motion.button
                      key={id}
                      type="button"
                      layout
                      className="back-card back-coach"
                      disabled={allChosen}
                      onClick={() => pick(id)}
                      whileHover={allChosen ? undefined : { y: -6, rotateX: 12 }}
                      aria-label={`קלף הפוך ${k + 1}`}
                      exit={{ opacity: 0, scale: 0.6 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="stations">
              <div className="stations-map">
                <span className="label">שלב 3 · חקירת התחנות ובניית התובנה</span>
                {map(station, true)}
                <div className="station-tabs" role="tablist" aria-label="תחנות">
                  {[0, 1, 2].map((i) => (
                    <button key={i} role="tab" aria-selected={station === i} className={`btn sm ${station === i ? 'solid' : 'ghost'}`} onClick={() => setStation(i)}>
                      תחנה {i + 1}
                    </button>
                  ))}
                  <button role="tab" aria-selected={station === 3} className={`btn sm ${station === 3 ? 'solid' : 'ghost'}`} onClick={() => setStation(3)}>
                    התובנה
                  </button>
                </div>
              </div>
              <div className="station-panel">
                {station < 3 && cur ? (
                  <>
                    <span className="label">
                      תחנה {station + 1} · {STATIONS[station].name}
                    </span>
                    <h2>{STATIONS[station].title}</h2>
                    <p className="muted">{STATIONS[station].explain}</p>
                    <ul className="questions">
                      {STATIONS[station].questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                    <blockquote className="inspiration">
                      <span className="label">השראה למילה "{cur.text}"</span>
                      {INSPIRATION[cur.text ?? ''] ?? 'אין עדיין שורת השראה למילה הזו.'}
                    </blockquote>
                    <div className="voice-box">
                      <textarea
                        aria-label={`מה מתגבש בתחנה ${station + 1}`}
                        rows={3}
                        placeholder="מה מתגבש בתחנה הזו. אפשר להקליד או להקליט"
                        value={cur.note}
                        onChange={(e) => updateCard(cur.id, { note: e.target.value })}
                      />
                      <Dictate inside label={`תחנה ${station + 1}`} onText={(t) => updateCard(cur.id, { note: appendText(cur.note, t) })} />
                    </div>
                    <p className="example">
                      <span className="label">דוגמה</span> {STATIONS[station].example}
                    </p>
                    <button className="btn solid" onClick={() => setStation(station + 1)}>
                      {station < 2 ? `לתחנה ${station + 2}` : 'בניית התובנה'}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="label">התובנה</span>
                    <h2>חבר את שלוש התחנות למשפט אחד.</h2>
                    <ol className="station-notes">
                      {[0, 1, 2].map((i) => (
                        <li key={i}>
                          <strong>{STATIONS[i].name}:</strong> {chosen[i]?.note || <span className="muted">עוד לא נכתב</span>}
                        </li>
                      ))}
                    </ol>
                    <div className="voice-box">
                      <textarea aria-label="התובנה" rows={3} placeholder="למשל: אני תקוע כי אני מחויב לציפיות של אחרים ולא לחופש שלי" value={s.insight ?? ''} onChange={(e) => update({ insight: e.target.value })} />
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
                <h2>בחר כרטיס מיקוד אחד</h2>
                <div className="focus-grid" role="radiogroup" aria-label="כרטיסי מיקוד">
                  {FOCUS_CARDS.map((q, i) => (
                    <motion.button
                      key={q}
                      type="button"
                      role="radio"
                      aria-checked={s.focus === i}
                      className={`focus-card ${s.focus === i ? 'on' : ''}`}
                      onClick={() => update({ focus: i })}
                      whileHover={{ y: -4, rotateX: 8 }}
                    >
                      <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                      {q}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div className="commit">
                <span className="label">ההתחייבות</span>
                <h2>{s.focus !== undefined ? FOCUS_CARDS[s.focus] : 'פעולה קונקרטית, מדידה ותחומה בזמן'}</h2>
                <label className="label" htmlFor="act-what">
                  מה אעשה
                </label>
                <div className="voice-box">
                  <textarea id="act-what" rows={3} placeholder="למשל: אקבע פגישת ייעוץ ראשונית של חצי שעה עם רואה חשבון" value={action.what} onChange={(e) => setAction({ what: e.target.value })} />
                  <Dictate inside label="הפעולה" onText={(t) => setAction({ what: appendText(action.what, t) })} />
                </div>
                <label className="label" htmlFor="act-when">
                  מתי
                </label>
                <div className="voice-row">
                  <input id="act-when" placeholder="למשל: ביום ראשון הקרוב ב-10:00" value={action.when} onChange={(e) => setAction({ when: e.target.value })} />
                  <Dictate label="מתי" onText={(t) => setAction({ when: appendText(action.when, t) })} />
                </div>
                <label className="label" htmlFor="act-measure">
                  איך אדע שעשיתי
                </label>
                <div className="voice-row">
                  <input id="act-measure" placeholder="למשל: הפגישה נקבעה ביומן" value={action.measure} onChange={(e) => setAction({ measure: e.target.value })} />
                  <Dictate label="איך אדע" onText={(t) => setAction({ measure: appendText(action.measure, t) })} />
                </div>
                <div className="checks" aria-label="בדיקת ההתחייבות">
                  <span className={action.what.trim() ? 'ok' : ''}>קונקרטית</span>
                  <span className={action.measure.trim() ? 'ok' : ''}>מדידה</span>
                  <span className={action.when.trim() ? 'ok' : ''}>תחומה בזמן</span>
                </div>
                <button
                  className="btn solid"
                  onClick={() => {
                    if (s.focus === undefined) return toast('כדאי לבחור קודם כרטיס מיקוד', 'error');
                    onSave();
                  }}
                >
                  שמירת התהליך
                </button>
              </div>
            </div>
          )}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
