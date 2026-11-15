import { motion } from 'framer-motion';
import { useState } from 'react';
import { Rich } from '../components/Rich';
import { CLARITY_QUESTIONS, CLARITY_WORDS } from '../lib/clarity';
import { useStore } from '../lib/store';
import { useFaceImages } from '../lib/useImages';

type Tab = 'words' | 'questions' | 'photos';

/** החפיסות של רגע בהירות: מילים ושאלות מקוריות, והתמונות ממאגר משחק האימון */
export function ClarityLibrary() {
  const coach = useStore((s) => s.coachCards);
  const urls = useFaceImages();
  const [tab, setTab] = useState<Tab>('words');
  const tabs: { id: Tab; label: string; n: number }[] = [
    { id: 'words', label: 'מילים', n: CLARITY_WORDS.length },
    { id: 'questions', label: 'שאלות', n: CLARITY_QUESTIONS.length },
    { id: 'photos', label: 'תמונות', n: coach.length },
  ];
  return (
    <div className="page clarity-lib">
      <header className="page-head">
        <span className="label">רגע בהירות / החפיסות</span>
        <h1>שלוש חפיסות</h1>
        <p className="lead">
          <Rich text="**מילה** שפותחת איכות, **שאלה** שמזמינה תשובה כנה, ו**תמונה** שמראה את מה שעוד לא נאמר. התמונות משותפות עם משחק האימון, ונערכות בספרייה שלו." />
        </p>
      </header>
      <div className="segmented lib-tabs" role="tablist" aria-label="החפיסות">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            {t.label} <span className="mono">{t.n}</span>
          </button>
        ))}
      </div>
      {tab === 'words' && (
        <ul className="clarity-grid">
          {CLARITY_WORDS.map((w, i) => (
            <motion.li key={w} className="clarity-tile word" initial={{ opacity: 0, rotateY: -40 }} animate={{ opacity: 1, rotateY: 0 }} transition={{ delay: Math.min(i, 24) * 0.015 }}>
              <span className="clarity-text">{w}</span>
            </motion.li>
          ))}
        </ul>
      )}
      {tab === 'questions' && (
        <ul className="clarity-grid questions-grid">
          {CLARITY_QUESTIONS.map((q, i) => (
            <motion.li key={q} className="clarity-tile question" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 24) * 0.015 }}>
              <span className="clarity-text">{q}</span>
            </motion.li>
          ))}
        </ul>
      )}
      {tab === 'photos' && (
        <ul className="clarity-grid photos-grid">
          {coach.map((c) => (
            <li key={c.id} className="clarity-tile photo">{urls.get(c.id) ? <img src={urls.get(c.id)} alt="" loading="lazy" /> : <span className="skeleton" />}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
