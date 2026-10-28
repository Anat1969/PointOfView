import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Dictate, appendText } from '../components/Dictate';
import { daysLeft, dueLabel } from '../components/Commit';
import { VisionCard } from '../components/VisionStep';
import { confirmAction, toast } from '../lib/feedback';
import { GAMES, gameOf } from '../lib/games';
import { go } from '../lib/router';
import { getState, setState, useStore } from '../lib/store';
import type { GameId, Session } from '../lib/types';
import { useFaceImages } from '../lib/useImages';
import { newSession } from './Home';

/** סדר הקיר: מה שמחכה לי קודם. פתוחות לפי תאריך יעד (מה שעבר מועדו למעלה), אחר כך בלי תאריך, ובסוף מה שבוצע */
function rank(s: Session) {
  if (s.done) return 3e9 + (1e12 - s.done.at) / 1e3;
  const n = daysLeft(s.action?.due);
  if (n !== null) return n;
  return 1e9 - s.updatedAt / 1e4;
}

export function History({ game }: { game: GameId }) {
  const all = useStore((s) => s.sessions);
  const sessions = useMemo(() => all.filter((x) => gameOf(x) === game).sort((a, b) => rank(a) - rank(b)), [all, game]);
  const urls = useFaceImages();
  const [closing, setClosing] = useState<string | null>(null);
  const [doneNote, setDoneNote] = useState('');

  const open = (s: Session) => {
    setState({ working: structuredClone(s) });
    go(`/${game}/session/${s.id}`);
  };

  const patch = (id: string, p: Partial<Session>) => {
    const st = getState();
    setState({
      sessions: st.sessions.map((x) => (x.id === id ? { ...x, ...p, updatedAt: Date.now() } : x)),
      ...(st.working?.id === id ? { working: { ...st.working, ...p } } : {}),
    });
  };

  const closeLoop = (s: Session) => {
    patch(s.id, { done: { at: Date.now(), note: doneNote.trim() } });
    setClosing(null);
    setDoneNote('');
    toast('המעגל נסגר. כל הכבוד');
  };

  const remove = (s: Session) =>
    confirmAction({
      title: `למחוק את "${s.title}"?`,
      body: 'הסשן, ההערות והתמונה שבו יימחקו מהמכשיר לצמיתות.',
      action: 'מחיקה',
      onConfirm: () => {
        const st = getState();
        setState({
          sessions: st.sessions.filter((x) => x.id !== s.id),
          ...(st.working?.id === s.id ? { working: null } : {}),
        });
        toast('הסשן נמחק');
      },
    });

  const openOnes = sessions.filter((s) => !s.done && s.action?.what?.trim());
  const doneCount = sessions.filter((s) => s.done).length;
  const next = openOnes[0];

  return (
    <div className="page wall-page">
      <header className="page-head">
        <span className="label">{GAMES[game].name} / קיר ההתחייבויות</span>
        <h1>קיר ההתחייבויות</h1>
        <p className="wall-meter">
          <strong>{openOnes.length}</strong> מחכות לי · <strong>{doneCount}</strong> בוצעו
        </p>
      </header>

      {sessions.length === 0 ? (
        <div className="empty">
          <h2>הקיר עוד ריק</h2>
          <p>כל תהליך נגמר בהתחייבות ובתמונה שלה. הן נתלות כאן, ומחכות לך עד שתבצע.</p>
          <button className="btn solid" onClick={() => newSession(game)}>
            תהליך חדש
          </button>
        </div>
      ) : (
        <>
          {next && (
            <section className="wall-next" aria-label="הצעד הבא">
              <span className="label">הצעד הבא שמחכה לי</span>
              <p className="wall-next-what">{next.action!.what}</p>
              <span className={`due ${(daysLeft(next.action?.due) ?? 1) < 0 ? 'late' : ''}`}>{dueLabel(next.action?.due) || next.action?.when || 'בלי תאריך יעד'}</span>
            </section>
          )}
          <motion.ul className="wall" layout>
            <AnimatePresence>
              {sessions.map((s, i) => {
                const n = daysLeft(s.action?.due);
                const cards = s.cards.filter((c) => c.kind !== 'reflection').slice(0, 3);
                return (
                  <motion.li
                    key={s.id}
                    layout
                    className={`wall-item ${s.done ? 'done' : ''} ${!s.done && n !== null && n < 0 ? 'late' : ''}`}
                    initial={{ opacity: 0, y: 30, rotateX: -18 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 22, delay: Math.min(i, 12) * 0.04 }}
                    style={{ ['--tilt' as string]: `${((i % 5) - 2) * 0.8}deg` }}
                  >
                    <button type="button" className="wall-open" onClick={() => open(s)} aria-label={`פתיחת "${s.title}"`}>
                      {s.vision?.path ? (
                        <VisionCard s={s} />
                      ) : (
                        <figure className="vision-card">
                          <div className="vision-photo wall-fallback">
                            {cards.map((c, k) => (
                              <span key={c.id} style={{ transform: `rotate(${(k - (cards.length - 1) / 2) * 10}deg)` }}>
                                {urls.get(c.refId) && <img src={urls.get(c.refId)} alt="" />}
                              </span>
                            ))}
                            <em>עוד אין תמונה</em>
                          </div>
                          <figcaption>
                            <p className="vision-what">{s.action?.what?.trim() || s.title}</p>
                            {(s.action?.when || s.action?.due) && <span className="mono vision-when">{[s.action?.when, dueLabel(s.action?.due)].filter(Boolean).join(' · ')}</span>}
                          </figcaption>
                        </figure>
                      )}
                    </button>
                    <div className="wall-foot">
                      <span className="mono">
                        {new Date(s.createdAt).toLocaleDateString('he-IL')} · {s.title}
                      </span>
                      {s.done ? (
                        s.done.note && <p className="done-note">{s.done.note}</p>
                      ) : closing === s.id ? (
                        <div className="close-loop">
                          <label className="label" htmlFor={`done-${s.id}`}>
                            מה קרה כשעשיתי?
                          </label>
                          <div className="voice-box">
                            <textarea id={`done-${s.id}`} rows={2} value={doneNote} onChange={(e) => setDoneNote(e.target.value)} placeholder="משפט אחד על מה שקרה, ומה למדתי" />
                            <Dictate inside label="מה קרה" onText={(t) => setDoneNote(appendText(doneNote, t))} />
                          </div>
                          <div className="row wrap">
                            <button className="btn solid sm" onClick={() => closeLoop(s)}>
                              סגירת המעגל
                            </button>
                            <button className="btn ghost sm" onClick={() => setClosing(null)}>
                              עוד לא
                            </button>
                          </div>
                        </div>
                      ) : (
                        s.action?.what?.trim() && (
                          <button className="btn solid sm" onClick={() => (setClosing(s.id), setDoneNote(''))}>
                            עשיתי
                          </button>
                        )
                      )}
                      <button className="link-btn" onClick={() => remove(s)}>
                        מחיקה
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>
        </>
      )}
    </div>
  );
}
