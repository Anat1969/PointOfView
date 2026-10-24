import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { toast } from '../lib/feedback';
import { go } from '../lib/router';
import { setState, useStore } from '../lib/store';
import { forgetEditorKey, saveEditorKey } from '../lib/supa';

/** כפתור הלוגו של הסטודיו: מאחוריו כל פעולות העריכה */
export function StudioMenu() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const canEdit = useStore((s) => s.canEdit);
  const editMode = useStore((s) => s.editMode);
  const sync = useStore((s) => s.sync);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const editing = canEdit && editMode;
  const toPage = (path: string) => {
    setOpen(false);
    go(path);
  };

  return (
    <div className="studio" ref={ref}>
      <button className={`studio-btn ${editing ? 'live' : ''}`} onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="studio-panel" aria-label="אד' ענת שטיבלמן A&I, תפריט עריכה">
        <span className="studio-mark" aria-hidden="true">
          A<em>&amp;</em>I
        </span>
        <span className="studio-name">אד' ענת שטיבלמן</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id="studio-panel"
            className="studio-panel"
            initial={{ opacity: 0, y: -10, rotateX: -20 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <span className="label on-dark">A&amp;I · אד' ענת שטיבלמן</span>
            {canEdit ? (
              <>
                <button
                  className={`btn sm ${editing ? 'solid-light' : 'ghost on-dark'}`}
                  onClick={() => {
                    setState({ editMode: !editMode });
                    toast(editMode ? 'מצב עריכה כבוי' : 'מצב עריכה פעיל');
                  }}
                  aria-pressed={editing}
                >
                  {editing ? 'מצב עריכה פעיל. לכיבוי' : 'הפעלת מצב עריכה'}
                </button>
                <button className="btn ghost sm on-dark" onClick={() => toPage('/faces')} disabled={!editing}>
                  עריכת ספריית פנים
                </button>
                <button className="btn ghost sm on-dark" onClick={() => toPage('/reflections')} disabled={!editing}>
                  עריכת השתקפויות
                </button>
                <button
                  className="btn ghost xs on-dark"
                  onClick={() => {
                    forgetEditorKey();
                    setState({ editMode: false });
                    location.reload();
                  }}
                >
                  ניתוק המכשיר מהעריכה
                </button>
              </>
            ) : sync === 'offline' ? (
              <p className="studio-text">אין חיבור לספרייה. העריכה תחזור כשהחיבור יחזור.</p>
            ) : (
              <form
                className="studio-key"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (key.trim().length < 16) return toast('מפתח העריכה קצר מדי', 'error');
                  saveEditorKey(key.trim());
                  setState({ editMode: true });
                  location.reload();
                }}
              >
                <label htmlFor="studio-key" className="studio-text">
                  כניסה לעריכה במכשיר הזה
                </label>
                <input id="studio-key" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="מפתח עריכה" />
                <button className="btn solid-light sm" type="submit">
                  כניסה
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
