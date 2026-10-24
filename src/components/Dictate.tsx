import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { toast } from '../lib/feedback';

// זיהוי דיבור מובנה בדפדפן: האודיו לא נשמר אצלנו, רק הטקסט שחוזר
type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecCtor = new () => Rec;

const recognizer = (): RecCtor | undefined =>
  (window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: RecCtor }).webkitSpeechRecognition;

/** מצרף טקסט מוקלט לטקסט קיים, עם רווח אחד ביניהם */
export const appendText = (prev: string, add: string) => (prev.trim() ? `${prev.replace(/\s+$/, '')} ${add}` : add);

const ERRORS: Record<string, string> = {
  'not-allowed': 'אין הרשאה למיקרופון. אפשר לאשר בהגדרות האתר בדפדפן.',
  'service-not-allowed': 'אין הרשאה למיקרופון. אפשר לאשר בהגדרות האתר בדפדפן.',
  'no-speech': 'לא נשמע דיבור. כדאי לנסות שוב, קרוב יותר למיקרופון.',
  'audio-capture': 'לא נמצא מיקרופון במכשיר.',
  network: 'התמלול צריך חיבור לרשת.',
};

/**
 * כפתור הקלטה ליד שדה טקסט: מדברים, והתמלול נכתב לתוך השדה.
 * inside: בפינת תיבת טקסט גדולה. beside: לצד שדה בשורה אחת.
 */
export function Dictate({ onText, label = 'שדה', inside = false }: { onText: (text: string) => void; label?: string; inside?: boolean }) {
  const [on, setOn] = useState(false);
  const [live, setLive] = useState('');
  const rec = useRef<Rec | null>(null);
  const finals = useRef('');
  const send = useRef(onText);
  send.current = onText;

  useEffect(() => () => rec.current?.abort(), []);

  const start = () => {
    const Ctor = recognizer();
    if (!Ctor) return toast('הדפדפן הזה לא תומך בהקלטה ותמלול. אפשר ב-Chrome, Edge או Safari.', 'error');
    const r = new Ctor();
    r.lang = 'he-IL';
    r.continuous = true;
    r.interimResults = true;
    finals.current = '';
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finals.current = appendText(finals.current, res[0].transcript.trim());
        else interim += res[0].transcript;
      }
      setLive(appendText(finals.current, interim.trim()));
    };
    r.onerror = (e) => {
      if (e.error !== 'aborted') toast(ERRORS[e.error] ?? 'ההקלטה נעצרה. כדאי לנסות שוב.', 'error');
    };
    r.onend = () => {
      const text = finals.current.trim();
      if (text) send.current(text);
      rec.current = null;
      setOn(false);
      setLive('');
    };
    rec.current = r;
    try {
      r.start();
      setOn(true);
    } catch {
      toast('לא הצלחתי להתחיל הקלטה. כדאי לנסות שוב.', 'error');
    }
  };

  return (
    <span className={`dictate ${inside ? 'inside' : 'beside'} ${on ? 'on' : ''}`}>
      <AnimatePresence>
        {on && (
          <motion.span className="dictate-live" role="status" aria-live="polite" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {live || 'מקשיב...'}
          </motion.span>
        )}
      </AnimatePresence>
      <button
        type="button"
        className={`btn xs dictate-btn ${on ? 'solid' : 'ghost'}`}
        onClick={() => (on ? rec.current?.stop() : start())}
        aria-pressed={on}
        aria-label={on ? `סיום הקלטה ל${label}` : `הקלטה ל${label}`}
      >
        {on && <span className="rec-dot" aria-hidden="true" />}
        {on ? 'סיום' : 'הקלטה'}
      </button>
    </span>
  );
}
