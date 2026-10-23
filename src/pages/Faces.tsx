import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { Tilt } from '../components/Tilt';
import { confirmAction, toast } from '../lib/feedback';
import { uid } from '../lib/id';
import { ACCEPTED, MAX_FILE_MB, deleteImage, prepareImage, putImage } from '../lib/images';
import { getState, setState, useStore } from '../lib/store';
import { MAX_FACES } from '../lib/types';
import { useFaceImages } from '../lib/useImages';

type UploadError = { file: string; reason: string };

export function Faces() {
  const faces = useStore((s) => s.faces);
  const urls = useFaceImages();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [errors, setErrors] = useState<UploadError[]>([]);
  const [over, setOver] = useState(false);

  const upload = async (files: File[]) => {
    const errs: UploadError[] = [];
    let room = MAX_FACES - getState().faces.length;
    const valid: File[] = [];
    for (const f of files) {
      if (!ACCEPTED.includes(f.type)) errs.push({ file: f.name, reason: 'סוג קובץ לא נתמך. רק JPG או PNG.' });
      else if (f.size > MAX_FILE_MB * 1024 * 1024) errs.push({ file: f.name, reason: `הקובץ גדול מ-${MAX_FILE_MB}MB.` });
      else if (room <= 0) errs.push({ file: f.name, reason: `הספרייה מלאה: ${MAX_FACES} פנים לכל היותר.` });
      else {
        valid.push(f);
        room--;
      }
    }
    setBusy(valid.length);
    let added = 0;
    for (const f of valid) {
      try {
        const blob = await prepareImage(f);
        const id = uid();
        await putImage(id, blob);
        setState({ faces: [...getState().faces, { id, name: f.name.replace(/\.[^.]+$/, ''), createdAt: Date.now() }] });
        added++;
      } catch {
        errs.push({ file: f.name, reason: 'לא הצלחתי לקרוא את התמונה. ייתכן שהקובץ פגום.' });
      }
      setBusy((b) => b - 1);
    }
    setErrors(errs);
    if (added) toast(added === 1 ? 'תמונה אחת נוספה' : `${added} תמונות נוספו`);
    if (errs.length && !added) toast('ההעלאה נכשלה', 'error');
  };

  const remove = (id: string, name: string) =>
    confirmAction({
      title: `למחוק את "${name}"?`,
      body: 'התמונה תימחק מהספרייה. בסשנים שמורים יופיע במקומה קלף חסר.',
      action: 'מחיקה',
      onConfirm: async () => {
        await deleteImage(id);
        setState({ faces: getState().faces.filter((f) => f.id !== id) });
        toast('התמונה נמחקה');
      },
    });

  const full = faces.length >= MAX_FACES;

  return (
    <div className="page">
      <header className="page-head">
        <span className="label">ספרייה / פנים</span>
        <h1>ספריית פנים</h1>
        <div className="meter" aria-label={`${faces.length} מתוך ${MAX_FACES}`}>
          <motion.span animate={{ width: `${(faces.length / MAX_FACES) * 100}%` }} />
        </div>
        <p className="mono">
          {faces.length} / {MAX_FACES}
        </p>
      </header>

      <div
        className={`dropzone ${over ? 'over' : ''} ${full ? 'disabled' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          upload(Array.from(e.dataTransfer.files));
        }}
      >
        <p>{full ? 'הספרייה מלאה. כדי להוסיף, יש למחוק פנים קיימות.' : 'גוררים לכאן תמונות JPG או PNG, או בוחרים מהמחשב.'}</p>
        <button className="btn solid" disabled={full || busy > 0} onClick={() => input.current?.click()}>
          {busy > 0 ? `מעלה... נותרו ${busy}` : 'העלאת תמונות'}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          hidden
          data-testid="face-input"
          onChange={(e) => {
            upload(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      </div>

      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div className="error-panel" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="error-head">
              <strong>{errors.length === 1 ? 'קובץ אחד לא הועלה' : `${errors.length} קבצים לא הועלו`}</strong>
              <button className="btn ghost sm" onClick={() => setErrors([])}>
                סגירה
              </button>
            </div>
            <ul>
              {errors.map((e, i) => (
                <li key={i}>
                  <span className="mono">{e.file}</span> {e.reason}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {faces.length === 0 ? (
        <div className="empty">
          <h2>הספרייה ריקה</h2>
          <p>הצעד הבא: להעלות את תמונות הפנים. עד {MAX_FACES} תמונות, והן נשמרות במכשיר הזה בלבד.</p>
        </div>
      ) : (
        <motion.ul className="face-grid" layout>
          <AnimatePresence>
            {faces.map((f, i) => (
              <motion.li
                key={f.id}
                layout
                initial={{ opacity: 0, rotateY: -70, scale: 0.9 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                exit={{ opacity: 0, rotateX: 60, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22, delay: Math.min(i, 20) * 0.02 }}
                style={{ perspective: 800 }}
              >
                <Tilt className="face-tile">
                  {urls.get(f.id) ? <img src={urls.get(f.id)} alt={f.name} loading="lazy" /> : <div className="skeleton" />}
                  <div className="face-meta">
                    <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                    <button className="btn ghost xs on-dark" onClick={() => remove(f.id, f.name)} aria-label={`מחיקת ${f.name}`}>
                      מחיקה
                    </button>
                  </div>
                </Tilt>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
