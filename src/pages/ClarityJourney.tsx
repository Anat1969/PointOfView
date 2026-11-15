import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { CardFace } from '../components/CardFace';
import { Commit } from '../components/Commit';
import { Dictate, appendText } from '../components/Dictate';
import { Rich } from '../components/Rich';
import { VisionStep } from '../components/VisionStep';
import { CLARITY_SLOTS, CLARITY_STEPS as STEPS } from '../lib/clarity';
import { drawCard } from '../lib/deck';
import { toast } from '../lib/feedback';
import type { Session, SessionCard } from '../lib/types';
import { useFaceImages } from '../lib/useImages';

/** קלף בשלישייה: הפוך עד שהופכים את שלושתם, ואז מתהפך בתלת־ממד */
function TriadCard({ card, flipped, url, index, active, onClick }: { card?: SessionCard; flipped: boolean; url?: string; index: number; active?: boolean; onClick?: () => void }) {
  const slot = CLARITY_SLOTS[index];
  return (
    <button type="button" className={`triad-slot slot-${slot.kind} ${card ? 'filled' : ''} ${active ? 'active' : ''}`} onClick={onClick} disabled={!onClick} aria-label={`${slot.name}${card ? '' : ': שליפה'}`}>
      <span className="triad-label">{slot.name}</span>
      <span className="map-card">
        {card ? (
          <motion.span className="map-flip" initial={false} animate={{ rotateY: flipped ? 0 : 180 }} transition={{ type: 'spring', stiffness: 90, damping: 14, delay: flipped ? index * 0.25 : 0 }}>
            <span className="map-front">
              <CardFace card={card} url={url} />
            </span>
            <span className={`map-back back-${slot.kind}`} />
          </motion.span>
        ) : (
          <span className={`triad-pile back-${slot.kind}`}>
            {[3, 2, 1].map((k) => (
              <span key={k} className="pile-layer" style={{ transform: `translate(${k * 3}px, ${k * 3}px)` }} />
            ))}
            <span className="pile-top">
              <b>{slot.name}</b>
              <span className="mono">לשליפה</span>
            </span>
          </span>
        )}
      </span>
    </button>
  );
}

export function ClarityJourney({ s, update, onSave }: { s: Session; update: (p: Partial<Session>) => void; onSave: (patch?: Partial<Session>) => void }) {
  const urls = useFaceImages();
  const step = s.step ?? 1;
  const at = (i: number) => s.cards.find((c) => c.stage === i);
  const chosen = [0, 1, 2].map(at);
  const allChosen = chosen.every(Boolean);
  const flipped = !!s.flipped && allChosen;
  const [tab, setTab] = useState(0); // 0 עד 2 הקלפים, 3 רגע הבהירות

  const go = (n: number) => update({ step: n });
  const canReach = (n: number) => n === 1 || (n === 2 && !!s.topic?.trim()) || (n >= 3 && n <= 4 && flipped) || (n === 5 && flipped && !!s.action?.what?.trim());

  const draw = (i: number) => {
    if (at(i)) return;
    const c = drawCard(s, CLARITY_SLOTS[i].kind);
    if (!c) return toast('אין קלפים פנויים בחפיסה', 'error');
    update({ cards: [...s.cards, { ...c, stage: i }] });
  };
  const updateCard = (cid: string, patch: Partial<SessionCard>) => update({ cards: s.cards.map((c) => (c.id === cid ? { ...c, ...patch } : c)) });
  const action = s.action ?? { what: '', when: '', measure: '' };
  const setAction = (p: Partial<typeof action>) => update({ action: { ...action, ...p } });
  const urlOf = (c?: SessionCard) => (c?.kind === 'photo' ? urls.get(c.refId) : undefined);

  const triad = (opts: { onSlot?: (i: number) => void; active?: number }) => (
    <div className="triad" role="group" aria-label="השלישייה">
      {[0, 1, 2].map((i) => (
        <TriadCard key={i} index={i} card={chosen[i]} flipped={flipped} url={urlOf(chosen[i])} active={opts.active === i} onClick={opts.onSlot ? () => opts.onSlot!(i) : undefined} />
      ))}
    </div>
  );

  const cur = tab < 3 ? chosen[tab] : undefined;

  return (
    <div className="journey clarity">
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
              <span className="label">שלב 1 · השאלה שאיתה באתי</span>
              <h2>
                <Rich text="על מה **אתה רוצה בהירות** היום?" />
              </h2>
              <p className="muted">
                <Rich text="נושא אחד, במשפט אחד. למשל: **האם לעזוב את העבודה**, או איך לדבר עם אמא שלי." />
              </p>
              <div className="voice-box">
                <textarea aria-label="השאלה שאיתה באתי" rows={4} placeholder="השאלה שלי. אפשר להקליד או להקליט" value={s.topic ?? ''} onChange={(e) => update({ topic: e.target.value })} />
                <Dictate inside label="השאלה שאיתה באתי" onText={(t) => update({ topic: appendText(s.topic ?? '', t) })} />
              </div>
              <button className="btn solid" onClick={() => go(2)} disabled={!s.topic?.trim()}>
                המשך לשליפת השלישייה
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="triad-step">
              <div className="triad-head">
                <span className="label">שלב 2 · שליפת השלישייה</span>
                <h2>
                  <Rich text={allChosen ? (flipped ? '**השלישייה גלויה.** מה הדבר הראשון שאתה רואה?' : 'שלושה קלפים הפוכים. **אפשר להפוך**') : 'שולפים **מילה, שאלה ותמונה**, בלי לחשוב'} />
                </h2>
                <p className="muted">הקלפים יוצאים הפוכים. רק כשכל השלושה על השולחן הופכים אותם יחד, ונותנים להם לדבר זה עם זה.</p>
              </div>
              {triad({ onSlot: allChosen ? undefined : draw })}
              <div className="row wrap center">
                {allChosen && !flipped && (
                  <button className="btn solid" onClick={() => update({ flipped: true })}>
                    הפיכת השלישייה
                  </button>
                )}
                {flipped && (
                  <button className="btn solid" onClick={() => (setTab(0), go(3))}>
                    המשך לרגע הבהירות
                  </button>
                )}
                {s.cards.length > 0 && !flipped && (
                  <button className="btn ghost" onClick={() => update({ cards: [], flipped: false })}>
                    החזרת הקלפים לחפיסה
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="stations">
              <div className="stations-map">
                <span className="label">שלב 3 · רגע הבהירות</span>
                {triad({ onSlot: (i) => setTab(i), active: tab })}
                <div className="station-tabs" role="tablist" aria-label="הקלפים">
                  {CLARITY_SLOTS.map((sl, i) => (
                    <button key={sl.kind} role="tab" aria-selected={tab === i} className={`btn sm ${tab === i ? 'solid' : 'ghost'}`} onClick={() => setTab(i)}>
                      {sl.name}
                    </button>
                  ))}
                  <button role="tab" aria-selected={tab === 3} className={`btn sm ${tab === 3 ? 'solid' : 'ghost'}`} onClick={() => setTab(3)}>
                    רגע הבהירות
                  </button>
                </div>
              </div>
              <div className="station-panel">
                {tab < 3 && cur ? (
                  <>
                    <span className="label">{CLARITY_SLOTS[tab].name}</span>
                    {cur.kind !== 'photo' && <p className={`clarity-quote q-${cur.kind}`}>{cur.text}</p>}
                    <h2>
                      <Rich text={CLARITY_SLOTS[tab].title} />
                    </h2>
                    <p className="muted">
                      <Rich text={CLARITY_SLOTS[tab].explain} />
                    </p>
                    <ul className="questions">
                      {CLARITY_SLOTS[tab].prompts.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                    <div className="voice-box">
                      <textarea
                        aria-label={`מה עולה מה${CLARITY_SLOTS[tab].name}`}
                        rows={3}
                        placeholder="מה עולה. אפשר להקליד או להקליט"
                        value={cur.note}
                        onChange={(e) => updateCard(cur.id, { note: e.target.value })}
                      />
                      <Dictate inside label={CLARITY_SLOTS[tab].name} onText={(t) => updateCard(cur.id, { note: appendText(cur.note, t) })} />
                    </div>
                    <button className="btn solid" onClick={() => setTab(tab + 1)}>
                      {tab < 2 ? `ל${CLARITY_SLOTS[tab + 1].name}` : 'לרגע הבהירות'}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="label">רגע הבהירות</span>
                    <h2>
                      <Rich text="מה **ברור לך עכשיו** שלא היה ברור קודם?" />
                    </h2>
                    <ol className="station-notes">
                      {CLARITY_SLOTS.map((sl, i) => (
                        <li key={sl.kind}>
                          <strong>{sl.name}{chosen[i]?.text ? ` "${chosen[i]!.text}"` : ''}:</strong> {chosen[i]?.note || <span className="muted">עוד לא נכתב</span>}
                        </li>
                      ))}
                    </ol>
                    <div className="voice-box">
                      <textarea aria-label="רגע הבהירות" rows={3} placeholder="משפט אחד. למשל: אני לא מפחד לעזוב, אני מפחד שלא אדע מי אני בלי התואר" value={s.insight ?? ''} onChange={(e) => update({ insight: e.target.value })} />
                      <Dictate inside label="רגע הבהירות" onText={(t) => update({ insight: appendText(s.insight ?? '', t) })} />
                    </div>
                    {s.insight?.trim() && (
                      <p className="clarity-moment">
                        <mark className="hl">{s.insight}</mark>
                      </p>
                    )}
                    <button className="btn solid" onClick={() => go(4)} disabled={!s.insight?.trim()}>
                      המשך לצעד אחד
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="lever">
              <div className="lever-cards">
                <span className="label">שלב 4 · צעד אחד</span>
                {s.insight && (
                  <blockquote className="insight-quote">
                    <mark className="hl">{s.insight}</mark>
                  </blockquote>
                )}
                {triad({})}
              </div>
              <div className="commit">
                <span className="label">ההתחייבות</span>
                <h2>
                  <Rich text="**צעד אחד** קטן, מדיד ותחום בזמן" />
                </h2>
                <Commit action={action} setAction={setAction} />
                <button
                  className="btn solid"
                  onClick={() => {
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
