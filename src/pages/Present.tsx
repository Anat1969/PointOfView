import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CardFace } from '../components/CardFace';
import { go } from '../lib/router';
import { useStore } from '../lib/store';
import { toUnits } from '../lib/units';
import { stationName } from '../lib/vision';
import type { GameId } from '../lib/types';
import { useFaceImages } from '../lib/useImages';

/** תצוגת קבוצה: גלגל קלפים בעומק, הקלף הנוכחי במרכז */
export function Present({ id, index, game }: { id: string; index: number; game: GameId }) {
  const session = useStore((s) => (s.working?.id === id ? s.working : s.sessions.find((x) => x.id === id)));
  const urls = useFaceImages();
  const stage = useRef<HTMLDivElement>(null);
  const [showNotes, setNotes] = useState(false);
  const [isFull, setIsFull] = useState(false);

  // בזוגות: פנים והשתקפות מוצגות יחד כיחידה אחת
  // בארבעה שלבים מוצגים רק שלבים שיש בהם קלפים
  const units = useMemo(() => (session ? toUnits(session).filter((u) => u.cards.length) : []), [session]);
  const count = units.length;
  const i = Math.min(index, Math.max(0, count - 1));

  const to = useCallback((n: number) => go(`/${game}/present/${id}/${Math.max(0, Math.min(count - 1, n))}`, true), [id, count]);

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else stage.current?.requestFullscreen?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    const onFs = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea')) return;
      // בעברית הקריאה מימין לשמאל: חץ שמאלה מתקדם
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        to(i + 1);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        to(i - 1);
      } else if (e.key === 'Home') to(0);
      else if (e.key === 'End') to(count - 1);
      else if (e.key === 'f' || e.key === 'כ') toggleFull();
      else if (e.key === 'n' || e.key === 'מ') setNotes((v) => !v);
      else if (e.key === 'Escape' && !document.fullscreenElement) go(`/${game}/session/${id}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, count, to, toggleFull, id]);

  if (!session || !count) {
    return (
      <div className="page">
        <div className="empty">
          <h2>אין קלפים להצגה</h2>
          <p>הצעד הבא: לשלוף קלפים בסשן, ואז לחזור לתצוגת הקבוצה.</p>
          <a className="btn solid" href={session ? `#/${game}/session/${id}` : `#/${game}`}>
            {session ? 'חזרה לסשן' : 'לדף הבית'}
          </a>
        </div>
      </div>
    );
  }

  const unit = units[i];
  const notes = unit.cards.map((c) => c.note).filter(Boolean).join('\n');

  return (
    <div className="present" ref={stage}>
      <div className="present-bar">
        <span className="label on-dark">{session.title}</span>
        <span className="mono counter">
          {String(i + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
        </span>
        <div className="row">
          <button className="btn ghost sm on-dark" onClick={() => setNotes((v) => !v)} aria-pressed={showNotes}>
            {showNotes ? 'הסתרת הערות' : 'הצגת הערות'}
          </button>
          <button className="btn ghost sm on-dark" onClick={toggleFull}>
            {isFull ? 'יציאה ממסך מלא' : 'מסך מלא'}
          </button>
          <a className="btn ghost sm on-dark" href={`#/${game}/session/${id}`}>
            חזרה לסשן
          </a>
        </div>
      </div>

      <div className="carousel" role="region" aria-roledescription="קרוסלה" aria-label="קלפי הסשן">
        {units.map((u, k) => {
          const d = k - i;
          if (Math.abs(d) > 4) return null;
          return (
            <motion.button
              key={u.key}
              className={`carousel-card ${u.cards.length > 1 ? `is-pair n${Math.min(u.cards.length, 4)}` : ''} ${d === 0 ? 'current' : ''}`}
              onClick={() => to(k)}
              tabIndex={d === 0 ? -1 : 0}
              aria-label={`קלף ${k + 1}`}
              aria-current={d === 0}
              initial={false}
              animate={{
                x: `${-d * (u.cards.length > 1 ? 34 : 58)}%`,
                z: -Math.abs(d) * 260,
                rotateY: d === 0 ? 0 : d > 0 ? 38 : -38,
                opacity: Math.abs(d) > 3 ? 0 : 1 - Math.abs(d) * 0.18,
                filter: `brightness(${d === 0 ? 1 : 0.55})`,
              }}
              transition={{ type: 'spring', stiffness: 140, damping: 22 }}
              style={{ zIndex: 50 - Math.abs(d) }}
            >
              {u.cards.map((c) => (
                <CardFace key={c.id} card={c} url={c.kind === 'reflection' ? undefined : urls.get(c.refId)} big />
              ))}
              {u.stage !== undefined && stationName(session, u.stage) && <span className="stage-chip">{stationName(session, u.stage)}</span>}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {notes && showNotes && (
          <motion.p key={unit.key} className="present-note" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {notes}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="present-nav">
        <button className="btn ghost on-dark" onClick={() => to(i - 1)} disabled={i === 0}>
          הקודם
        </button>
        <div className="dots" aria-hidden="true">
          {units.map((u, k) => (
            <span key={u.key} className={`${k === i ? 'on' : ''} dot-${u.cards[0].kind}`} />
          ))}
        </div>
        <button className="btn ghost on-dark" onClick={() => to(i + 1)} disabled={i === count - 1}>
          הבא
        </button>
      </div>
      <p className="present-keys mono">חיצים למעבר · F מסך מלא · N הערות · Esc חזרה</p>
    </div>
  );
}
