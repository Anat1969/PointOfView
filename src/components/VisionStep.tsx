import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { toast } from '../lib/feedback';
import type { Session } from '../lib/types';
import { requestVision, uploadOwnVision, visionUrl } from '../lib/vision';
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
  const [busy, setBusy] = useState<'' | 'image' | 'prompt' | 'upload'>('');
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (busy !== 'image') return;
    setPhase(0);
    const t = setInterval(() => setPhase((p) => Math.min(p + 1, PHASES.length - 1)), 4500);
    return () => clearInterval(t);
  }, [busy]);

  const ready = !!(s.action?.what?.trim() || s.insight?.trim());

  /** פרומפט ותמונה (או פרומפט בלבד). הפרומפט נשמר תמיד, גם כשהמחולל לא החזיר תמונה */
  const create = async (mode?: 'prompt') => {
    setBusy(mode ?? 'image');
    setError('');
    setNote('');
    try {
      const v = await requestVision(s, s.vision?.prompt, mode);
      // תמונה קודמת נשארת כשהפעם נבנה רק פרומפט או כשהמחולל לא החזיר תמונה
      const path = v.path ?? s.vision?.path;
      onSave({ vision: { path: path ?? undefined, distill: v.distill, prompt: v.prompt, promptEn: v.promptEn, title: v.title, own: v.path ? false : s.vision?.own, at: Date.now() } });
      if (v.path) toast('התמונה נוצרה ונשמרה בקיר ההתחייבויות');
      else if (mode === 'prompt') toast('הפרומפט מוכן להעתקה');
      else setNote(v.imageError ?? 'התמונה לא נוצרה הפעם. הפרומפט מוכן להעתקה.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy('');
    }
  };

  const copy = async (text: string | undefined, what: string) => {
    try {
      await navigator.clipboard.writeText(text ?? '');
      toast(`${what} הועתק`);
    } catch {
      toast('לא הצלחתי להעתיק', 'error');
    }
  };

  /** תמונה שיצרת בעצמך מהפרומפט נכנסת למסגרת */
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy('upload');
    setError('');
    setNote('');
    try {
      const path = await uploadOwnVision(s, file);
      onSave({ vision: { distill: s.vision?.distill ?? s.insight?.trim() ?? '', prompt: s.vision?.prompt ?? '', promptEn: s.vision?.promptEn, title: s.vision?.title, path, own: true, at: Date.now() } });
      toast('התמונה שלך נכנסה למסגרת ונשמרה בקיר');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy('');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="vision-step">
      <div className="vision-stage">
        <VisionCard s={s} busy={busy === 'image' || busy === 'upload'} />
      </div>
      <div className="vision-side">
        <span className="label">שלב 5 · תמונת ההתחייבות</span>
        <h2>תמונה אחת ששווה אלף מילים</h2>
        <p className="muted">
          התמונה נבנית מהסשן כולו: הנושא, הקלפים, התובנה וההתחייבות. היא מצלמת את הרגע שבו הצעד כבר נעשה, ונשמרת בקיר ההתחייבויות כדי שתפגוש אותה עד שתבצע.
        </p>
        {!ready && <p className="status-line">כדי לבנות תמונה צריך קודם התחייבות או תובנה.</p>}
        {busy === 'image' && (
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
        {note && (
          <p className="status-line" role="status">
            {note}
          </p>
        )}
        <div className="row wrap">
          <button className="btn solid" onClick={() => create()} disabled={!!busy || !ready}>
            {busy === 'image' ? 'יוצר...' : s.vision?.path ? 'תמונה אחרת' : 'יצירת התמונה'}
          </button>
          <button className="btn" onClick={() => create('prompt')} disabled={!!busy || !ready}>
            {busy === 'prompt' ? 'בונה...' : s.vision?.prompt ? 'פרומפט חדש' : 'רק פרומפט'}
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()} disabled={!!busy}>
            {busy === 'upload' ? 'מעלה...' : 'העלאת תמונה משלי'}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="העלאת תמונה משלי" onChange={(e) => upload(e.target.files?.[0])} />
        </div>
        {s.vision?.prompt && (
          <section className="vision-prompt" aria-label="הפרומפט">
            <span className="label">הפרומפט שנבנה מהסשן</span>
            {s.vision.distill && <p className="vision-prompt-distill">{s.vision.distill}</p>}
            <p className="vision-prompt-text">{s.vision.prompt}</p>
            <div className="row wrap">
              <button className="btn sm" onClick={() => copy(s.vision?.prompt, 'הפרומפט')}>
                העתקת הפרומפט
              </button>
              {s.vision.promptEn && (
                <button className="btn ghost sm" onClick={() => copy(s.vision?.promptEn, 'הפרומפט באנגלית')}>
                  העתקה באנגלית
                </button>
              )}
            </div>
            <p className="muted small">אפשר ליצור את התמונה בכל מחולל, ואז להעלות אותה למסגרת עם "העלאת תמונה משלי".</p>
          </section>
        )}
      </div>
    </div>
  );
}
