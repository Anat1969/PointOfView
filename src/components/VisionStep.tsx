import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { toast } from '../lib/feedback';
import type { Session } from '../lib/types';
import { requestVision, visionUrl } from '../lib/vision';
import { dueLabel } from './Commit';

const PHASES = ['קורא את הסשן', 'מזקק את התובנה', 'בונה את הפרומפט', 'מצלם את התמונה', 'שומר בקיר ההתחייבויות'];

/** כרטיס ההתחייבות: התמונה בתוך מסגרת הקלף, משפט הזיקוק וההתחייבות. אותו כרטיס מופיע בקיר */
export function VisionCard({ s, busy = false }: { s: Session; busy?: boolean }) {
  const url = visionUrl(s);
  const due = s.done ? '' : dueLabel(s.action?.due);
  return (
    <figure className={`vision-card ${url ? 'has-image' : ''} ${s.done ? 'is-done' : ''}`}>
      <div className="vision-photo">
        {url ? (
          <motion.img key={url} src={url} alt={s.vision?.distill ?? 'תמונת ההתחייבות'} initial={{ opacity: 0, rotateY: -70, scale: 0.92 }} animate={{ opacity: 1, rotateY: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 70, damping: 14 }} />
        ) : (
          <span className={`vision-empty ${busy ? 'busy' : ''}`}>{busy ? 'התמונה נבנית' : 'כאן תופיע התמונה'}</span>
        )}
        {s.done && <span className="vision-stamp">בוצע</span>}
      </div>
      <figcaption>
        {s.vision?.title && <span className="label">{s.vision.title}</span>}
        {s.vision?.distill && <p className="vision-distill">{s.vision.distill}</p>}
        <p className="vision-what">{s.action?.what?.trim() || 'ההתחייבות עוד לא נכתבה'}</p>
        {(s.action?.when || due) && (
          <span className="mono vision-when">
            {[s.action?.when, due].filter(Boolean).join(' · ')}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

export function VisionStep({ s, onSave }: { s: Session; onSave: (patch?: Partial<Session>) => void }) {
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!busy) return;
    setPhase(0);
    const t = setInterval(() => setPhase((p) => Math.min(p + 1, PHASES.length - 1)), 4500);
    return () => clearInterval(t);
  }, [busy]);

  const ready = !!(s.action?.what?.trim() || s.insight?.trim());

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      const v = await requestVision(s, s.vision?.prompt);
      onSave({ vision: { path: v.path, distill: v.distill, prompt: v.prompt, title: v.title, at: Date.now() } });
      toast('התמונה נוצרה ונשמרה בקיר ההתחייבויות');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(s.vision?.prompt ?? '');
      toast('הפרומפט הועתק');
    } catch {
      toast('לא הצלחתי להעתיק', 'error');
    }
  };

  return (
    <div className="vision-step">
      <div className="vision-stage">
        <VisionCard s={s} busy={busy} />
      </div>
      <div className="vision-side">
        <span className="label">שלב 5 · תמונת ההתחייבות</span>
        <h2>תמונה אחת ששווה אלף מילים</h2>
        <p className="muted">
          התמונה נבנית מהסשן כולו: הנושא, הקלפים, התובנה וההתחייבות. היא מצלמת את הרגע שבו הצעד כבר נעשה, ונשמרת בקיר ההתחייבויות כדי שתפגוש אותה עד שתבצע.
        </p>
        {!ready && <p className="status-line">כדי לבנות תמונה צריך קודם התחייבות או תובנה.</p>}
        {busy && (
          <ol className="vision-phases" aria-live="polite">
            {PHASES.map((p, i) => (
              <li key={p} className={i < phase ? 'done' : i === phase ? 'on' : ''}>
                {p}
              </li>
            ))}
          </ol>
        )}
        {error && (
          <p className="status-line error" role="alert">
            {error}
          </p>
        )}
        <div className="row wrap">
          <button className="btn solid" onClick={create} disabled={busy || !ready}>
            {busy ? 'יוצר...' : s.vision ? 'תמונה אחרת' : 'יצירת התמונה'}
          </button>
        </div>
        {s.vision?.prompt && (
          <details className="vision-prompt">
            <summary>הפרומפט שנבנה מהסשן</summary>
            <p>{s.vision.prompt}</p>
            <button className="btn ghost sm" onClick={copyPrompt}>
              העתקת הפרומפט
            </button>
          </details>
        )}
      </div>
    </div>
  );
}
