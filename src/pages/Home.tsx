import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Ring3D, type RingItem } from '../components/Ring3D';
import { Tilt } from '../components/Tilt';
import { go } from '../lib/router';
import { getState, setState, useStore } from '../lib/store';
import { uid } from '../lib/id';
import { MAX_FACES, MAX_REFLECTIONS } from '../lib/types';
import { useFaceImages } from '../lib/useImages';

export function newSession() {
  const now = Date.now();
  const s = {
    id: uid(),
    title: `סשן ${new Date(now).toLocaleDateString('he-IL')}`,
    mode: 'personal' as const,
    participants: '',
    summary: '',
    cards: [],
    createdAt: now,
    updatedAt: now,
  };
  setState({ working: s });
  go(`/session/${s.id}`);
}

const rise = (i: number) => ({
  initial: { opacity: 0, y: 30, rotateX: -25 },
  animate: { opacity: 1, y: 0, rotateX: 0 },
  transition: { delay: 0.15 + i * 0.08, type: 'spring' as const, stiffness: 160, damping: 20 },
});

export function Home() {
  const faces = useStore((s) => s.faces);
  const refl = useStore((s) => s.reflections);
  const sessions = useStore((s) => s.sessions);
  const working = useStore((s) => s.working);
  const urls = useFaceImages();

  const ring: RingItem[] = useMemo(() => {
    const items: RingItem[] = [];
    faces.slice(0, 12).forEach((f) => items.push({ key: f.id, url: urls.get(f.id) }));
    refl.words.slice(0, 6).forEach((w) => items.push({ key: w.id, word: w.text }));
    for (let i = items.length; i < 14; i++) items.push({ key: `g${i}` });
    return items;
  }, [faces, refl, urls]);

  const reflTotal = refl.words.length + refl.blanks;
  const workingUnsaved = working && !getState().sessions.some((s) => s.id === working.id) && working.cards.length > 0;

  const tiles = [
    {
      label: '01',
      title: 'סשן חדש',
      text: faces.length ? 'שליפה, החלפה והערה לכל קלף.' : 'אפשר להתחיל גם בלי ספרייה מלאה.',
      onClick: newSession,
      primary: true,
    },
    { label: '02', title: 'ספריית פנים', text: `${faces.length} מתוך ${MAX_FACES} פנים`, onClick: () => go('/faces') },
    { label: '03', title: 'ספריית השתקפויות', text: `${reflTotal} מתוך ${MAX_REFLECTIONS} קלפים`, onClick: () => go('/reflections') },
    { label: '04', title: 'היסטוריית סשנים', text: `${sessions.length} סשנים שמורים`, onClick: () => go('/history') },
  ];

  return (
    <div className="page home">
      <section className="hero">
        <Ring3D items={ring} />
        <motion.div className="hero-copy" {...rise(0)}>
          <span className="label">FACES / סשנים עם קלפי פנים והשתקפויות</span>
          <h1>
            פנים שפוגשות
            <br />
            מילה
          </h1>
          <p>שליפה אקראית של פנים והשתקפויות, הערה לכל קלף, ותצוגה מלאה לקבוצה. הכל נשמר במכשיר הזה.</p>
        </motion.div>
      </section>

      {workingUnsaved && (
        <motion.button className="resume" onClick={() => go(`/session/${working!.id}`)} {...rise(1)}>
          <span className="label">טיוטה פתוחה</span>
          <span>
            {working!.title}, {working!.cards.length} קלפים. להמשך עבודה
          </span>
        </motion.button>
      )}

      <section className="tiles">
        {tiles.map((t, i) => (
          <motion.div key={t.label} {...rise(i + 1)} style={{ perspective: 900 }}>
            <Tilt className={`tile ${t.primary ? 'primary' : ''}`}>
              <button className="tile-btn" onClick={t.onClick}>
                <span className="label">{t.label}</span>
                <span className="tile-title">{t.title}</span>
                <span className="tile-text">{t.text}</span>
              </button>
            </Tilt>
          </motion.div>
        ))}
      </section>

      {!faces.length && !refl.words.length && (
        <motion.p className="empty-hint" {...rise(6)}>
          הצעד הבא: להעלות תמונות פנים לספרייה ולהזין מילים להשתקפויות. אחר כך כל סשן שולף מהן.
        </motion.p>
      )}
    </div>
  );
}
