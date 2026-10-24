import { AnimatePresence, motion } from 'framer-motion';
import { Tilt } from '../components/Tilt';
import { exportCSV, exportJSON } from '../lib/exporters';
import { confirmAction, toast } from '../lib/feedback';
import { uid } from '../lib/id';
import { go } from '../lib/router';
import { getState, setState, useStore } from '../lib/store';
import type { GameId, Session } from '../lib/types';
import { GAMES, gameOf } from '../lib/games';
import { useMemo } from 'react';
import { useFaceImages } from '../lib/useImages';
import { newSession } from './Home';

export function History({ game }: { game: GameId }) {
  const all = useStore((s) => s.sessions);
  const sessions = useMemo(() => all.filter((x) => gameOf(x) === game), [all, game]);
  const urls = useFaceImages();

  const open = (s: Session) => {
    setState({ working: structuredClone(s) });
    go(`/${game}/session/${s.id}`);
  };

  const duplicate = (s: Session) => {
    const now = Date.now();
    const copy: Session = {
      ...structuredClone(s),
      id: uid(),
      title: `${s.title} (עותק)`,
      createdAt: now,
      updatedAt: now,
    };
    copy.cards = copy.cards.map((c) => ({ ...c, id: uid() }));
    setState({ sessions: [copy, ...getState().sessions] });
    toast('הסשן שוכפל');
  };

  const remove = (s: Session) =>
    confirmAction({
      title: `למחוק את "${s.title}"?`,
      body: 'הסשן וכל ההערות שבו יימחקו לצמיתות. כדאי לייצא קודם.',
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

  return (
    <div className="page">
      <header className="page-head">
        <span className="label">{GAMES[game].name} / ארכיון</span>
        <h1>היסטוריית סשנים</h1>
        <p className="mono">{sessions.length} סשנים שמורים</p>
        {sessions.length > 0 && (
          <div className="row">
            <button className="btn ghost sm" onClick={() => exportJSON(sessions)}>
              ייצוא הכל JSON
            </button>
            <button className="btn ghost sm" onClick={() => exportCSV(sessions)}>
              ייצוא הכל CSV
            </button>
          </div>
        )}
      </header>

      {sessions.length === 0 ? (
        <div className="empty">
          <h2>עוד אין סשנים שמורים</h2>
          <p>הצעד הבא: לפתוח סשן, לשלוף קלפים וללחוץ "שמירה". הסשן יופיע כאן.</p>
          <button className="btn solid" onClick={() => newSession(game)}>
            סשן חדש
          </button>
        </div>
      ) : (
        <motion.ul className="history" layout>
          <AnimatePresence>
            {sessions.map((s, i) => {
              const faceCards = s.cards.filter((c) => c.kind !== 'reflection').slice(0, 5);
              return (
                <motion.li
                  key={s.id}
                  layout
                  initial={{ opacity: 0, x: 40, rotateY: -20 }}
                  animate={{ opacity: 1, x: 0, rotateY: 0 }}
                  exit={{ opacity: 0, x: -40, rotateY: 20 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 24, delay: Math.min(i, 10) * 0.04 }}
                  style={{ perspective: 1000 }}
                >
                  <Tilt max={4} className="history-card">
                    <div className="fan" aria-hidden="true">
                      {faceCards.length ? (
                        faceCards.map((c, k) => (
                          <span key={c.id} style={{ transform: `rotate(${(k - (faceCards.length - 1) / 2) * 9}deg) translateZ(${k * 6}px)` }}>
                            {urls.get(c.refId) && <img src={urls.get(c.refId)} alt="" />}
                          </span>
                        ))
                      ) : (
                        <span className="ghost-card" />
                      )}
                    </div>
                    <div className="history-body">
                      <span className="label">
                        {new Date(s.createdAt).toLocaleDateString('he-IL')} · {s.mode === 'group' ? 'קבוצתי' : 'אישי'} · {s.cards.length} קלפים
                      </span>
                      <h2>{s.title}</h2>
                      {s.participants && <p className="muted">{s.participants}</p>}
                      {s.summary && <p className="summary-line">{s.summary}</p>}
                      <div className="row wrap">
                        <button className="btn solid sm" onClick={() => open(s)}>
                          פתיחה
                        </button>
                        <button className="btn ghost sm" onClick={() => duplicate(s)}>
                          שכפול
                        </button>
                        <button className="btn ghost sm" onClick={() => exportJSON([s])}>
                          JSON
                        </button>
                        <button className="btn ghost sm" onClick={() => exportCSV([s])}>
                          CSV
                        </button>
                        <button className="btn ghost sm danger-text" onClick={() => remove(s)}>
                          מחיקה
                        </button>
                      </div>
                    </div>
                  </Tilt>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
