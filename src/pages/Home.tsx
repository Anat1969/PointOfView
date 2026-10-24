import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Ring3D, type RingItem } from '../components/Ring3D';
import { Tilt } from '../components/Tilt';
import { GAMES, gameOf } from '../lib/games';
import { go } from '../lib/router';
import { getState, setState, useStore } from '../lib/store';
import { uid } from '../lib/id';
import type { GameId, Session } from '../lib/types';
import { MAX_COACH, MAX_FACES, MAX_REFLECTIONS } from '../lib/types';
import { useFaceImages } from '../lib/useImages';

export function newSession(game: GameId) {
  const now = Date.now();
  const s: Session = {
    id: uid(),
    game,
    form: GAMES[game].defaultForm,
    title: `${game === 'coaching' ? 'אימון' : 'סשן'} ${new Date(now).toLocaleDateString('he-IL')}`,
    mode: 'personal',
    participants: '',
    summary: '',
    cards: [],
    createdAt: now,
    updatedAt: now,
  };
  setState({ working: s });
  go(`/${game}/session/${s.id}`);
}

export const rise = (i: number) => ({
  initial: { opacity: 0, y: 30, rotateX: -25 },
  animate: { opacity: 1, y: 0, rotateX: 0 },
  transition: { delay: 0.15 + i * 0.08, type: 'spring' as const, stiffness: 160, damping: 20 },
});

/** דף הבית של משחק אחד: עומד בפני עצמו */
export function Home({ game }: { game: GameId }) {
  const cfg = GAMES[game];
  const faces = useStore((s) => s.faces);
  const refl = useStore((s) => s.reflections);
  const coach = useStore((s) => s.coachCards);
  const sessions = useStore((s) => s.sessions.filter((x) => gameOf(x) === game).length);
  const working = useStore((s) => s.working);
  const urls = useFaceImages();

  const ring: RingItem[] = useMemo(() => {
    const items: RingItem[] = [];
    if (game === 'faces') {
      faces.slice(0, 12).forEach((f) => items.push({ key: f.id, url: urls.get(f.id) }));
      refl.words.slice(0, 6).forEach((w) => items.push({ key: w.id, word: w.text }));
    } else {
      coach.slice(0, 16).forEach((c) => items.push({ key: c.id, url: urls.get(c.id), caption: c.word }));
    }
    for (let i = items.length; i < 14; i++) items.push({ key: `g${i}` });
    return items;
  }, [game, faces, refl, coach, urls]);

  const workingHere = working && gameOf(working) === game && !getState().sessions.some((s) => s.id === working.id) && working.cards.length > 0;

  const tiles =
    game === 'faces'
      ? [
          { title: 'ספריית פנים', text: `${faces.length} מתוך ${MAX_FACES} פנים`, path: '/faces/library' },
          { title: 'ספריית השתקפויות', text: `${refl.words.length + refl.blanks} מתוך ${MAX_REFLECTIONS} קלפים`, path: '/faces/words' },
        ]
      : [{ title: 'ספריית קלפים', text: `${coach.length} מתוך ${MAX_COACH} קלפים`, path: '/coaching/library' }];

  const all = [
    { title: 'סשן חדש', text: 'שליפה, הערה לכל קלף, ותצוגה לקבוצה.', onClick: () => newSession(game), primary: true },
    ...tiles.map((t) => ({ ...t, onClick: () => go(t.path), primary: false })),
    { title: 'היסטוריית סשנים', text: `${sessions} סשנים שמורים`, onClick: () => go(`/${game}/history`), primary: false },
  ];

  return (
    <div className={`page home game-${game}`}>
      <section className="hero">
        <Ring3D items={ring} />
        <motion.div className="hero-copy" {...rise(0)}>
          <span className="label">{cfg.label}</span>
          <h1>
            {cfg.heroLines[0]}
            <br />
            {cfg.heroLines[1]}
          </h1>
          <p>{cfg.about} הספריות משותפות לכל המכשירים, והסשנים נשמרים במכשיר שלך.</p>
        </motion.div>
      </section>

      {workingHere && (
        <motion.button className="resume" onClick={() => go(`/${game}/session/${working!.id}`)} {...rise(1)}>
          <span className="label">טיוטה פתוחה</span>
          <span>
            {working!.title}, {working!.cards.length} קלפים. להמשך עבודה
          </span>
        </motion.button>
      )}

      <section className="tiles" style={{ ["--tiles" as string]: all.length }}>
        {all.map((t, i) => (
          <motion.div key={t.title} {...rise(i + 1)} style={{ perspective: 900 }}>
            <Tilt className={`tile ${t.primary ? 'primary' : ''}`}>
              <button className="tile-btn" onClick={t.onClick}>
                <span className="label">{String(i + 1).padStart(2, '0')}</span>
                <span className="tile-title">{t.title}</span>
                <span className="tile-text">{t.text}</span>
              </button>
            </Tilt>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
