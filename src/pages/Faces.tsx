import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { LibraryNote } from '../components/LibraryNote';
import { Tilt } from '../components/Tilt';
import { confirmAction, toast } from '../lib/feedback';
import { ACCEPTED, MAX_FILE_MB, prepareImage } from '../lib/images';
import { addFaceImage, deleteFace, restoreStarterFaces } from '../lib/library';
import { STARTER_FACE_COUNT } from '../lib/starter';
import { getState, useStore } from '../lib/store';
import type { Face } from '../lib/types';
import { MAX_FACES } from '../lib/types';
import { useFaceImages } from '../lib/useImages';

type UploadError = { file: string; reason: string };

export function Faces() {
  const faces = useStore((s) => s.faces);
  const canEdit = useStore((s) => s.canEdit && s.sync === 'ready');
  const urls = useFaceImages();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [errors, setErrors] = useState<UploadError[]>([]);
  const [over, setOver] = useState(false);

  const upload = async (files: File[]) => {
    if (!canEdit) return;
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
        if (await addFaceImage(blob, f.name.replace(/\.[^.]+$/, ''))) added++;
        else errs.push({ file: f.name, reason: 'ההעלאה לספרייה המשותפת נכשלה. כדאי לנסות שוב.' });
      } catch {
        errs.push({ file: f.name, reason: 'לא הצלחתי לקרוא את התמונה. ייתכן שהקובץ פגום.' });
      }
      setBusy((b) => b - 1);
    }
    setErrors(errs);
    if (added) toast(added === 1 ? 'תמונה אחת נוספה' : `${added} תמונות נוספו`);
    if (errs.length && !added) toast('ההעלאה נכשלה', 'error');
  };

  const remove = (f: Face) =>
    confirmAction({
      title: `למחוק את "${f.name}"?`,
      body: f.starter ? 'הדיוקן יוסר מהספרייה המשותפת. אפשר להחזיר אותו בכל עת.' : 'התמונה תימחק מהספרייה המשותפת. בסשנים שמורים יופיע במקומה קלף חסר.',
      action: 'מחיקה',
      onConfirm: () => deleteFace(f),
    });

  const full = faces.length >= MAX_FACES;
  const starterMissing = STARTER_FACE_COUNT - faces.filter((f) => f.starter).length;

  return (
    <div className="page">
      <header className="page-head">
        <span className="label">ספרייה / פנים</span>
        <h1>ספריית פנים</h1>
        <div className="meter" aria-label={`${faces.length} מתוך ${MAX_FACES}`}>
          <motion.span animate={{ width: `${(faces.length / MAX_FACES) * 100}%` }} />
        </div>
        <p className="mono">
          {faces.length} / {MAX_FACES} · {faces.filter((f) => f.starter).length} דיוקנאות מאוירים · {faces.filter((f) => f.image_path).length} תמונות שהועלו
        </p>
        <LibraryNote />
      </header>

      {canEdit && (
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
          <div className="row wrap">
            {starterMissing > 0 && !full && (
              <button className="btn ghost" onClick={restoreStarterFaces}>
                החזרת דיוקנאות הפתיחה ({starterMissing})
              </button>
            )}
            <button className="btn solid" disabled={full || busy > 0} onClick={() => input.current?.click()}>
              {busy > 0 ? `מעלה... נותרו ${busy}` : 'העלאת תמונות'}
            </button>
          </div>
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
      )}

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
          <p>{canEdit ? `הצעד הבא: להעלות תמונות פנים, או להחזיר את ${STARTER_FACE_COUNT} דיוקנאות הפתיחה.` : 'הספרייה עוד לא נטענה. אם אין חיבור, כדאי לנסות שוב בעוד רגע.'}</p>
          {canEdit && (
            <button className="btn solid" onClick={restoreStarterFaces}>
              טעינת דיוקנאות הפתיחה
            </button>
          )}
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
                    <span className="mono">{f.name}</span>
                    {canEdit && (
                      <button className="btn ghost xs on-dark" onClick={() => remove(f)} aria-label={`מחיקת ${f.name}`}>
                        מחיקה
                      </button>
                    )}
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
