import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { ConfirmDialog, Toasts } from './components/Feedback';
import { TopBar } from './components/TopBar';
import { GAMES } from './lib/games';
import { loadLibrary } from './lib/library';
import { useRoute, type Route } from './lib/router';
import { CoachLibrary } from './pages/CoachLibrary';
import { Faces } from './pages/Faces';
import { History } from './pages/History';
import { Home } from './pages/Home';
import { Present } from './pages/Present';
import { Reflections } from './pages/Reflections';
import { SessionPage } from './pages/SessionPage';
import { Suite } from './pages/Suite';

const PAGE_TITLES: Record<Route['page'], string> = {
  suite: '',
  home: '',
  library: 'ספרייה',
  words: 'השתקפויות',
  history: 'קיר ההתחייבויות',
  session: 'סשן',
  present: 'תצוגת קבוצה',
};

function titleOf(route: Route) {
  if (route.page === 'suite') return 'Point of View · סדרת כלים';
  const game = GAMES[route.game].name;
  return PAGE_TITLES[route.page] ? `${PAGE_TITLES[route.page]} · ${game}` : `${game} · Point of View`;
}

export function App() {
  const route = useRoute();
  useEffect(() => {
    loadLibrary();
    // ריענון כשחוזרים לחלון, כדי לקבל שינויים ממכשיר אחר
    const onFocus = () => document.visibilityState === 'visible' && loadLibrary();
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, []);
  const title = titleOf(route);
  useEffect(() => {
    document.title = title;
    if (route.page !== 'present') window.scrollTo({ top: 0 });
  }, [title, route.page]);

  const game = route.page === 'suite' ? 'suite' : route.game;
  const pageKey = route.page === 'session' || route.page === 'present' ? `${game}-${route.page}-${route.id}` : `${game}-${route.page}`;

  return (
    <>
      <div className="backdrop" aria-hidden="true">
        <span className="plane p1" />
        <span className="plane p2" />
        <span className="plane p3" />
      </div>
      <TopBar route={route} />
      <main className={route.page === 'present' ? 'main present-main' : route.page === 'session' ? 'main stage-main' : 'main'}>
        {/* כניסה מונפשת לכל דף. בלי AnimatePresence: במצב wait הוא החזיק עותק ישן של הדף אחרי מעבר מהשולחן */}
        <motion.div
          key={pageKey}
          initial={{ opacity: 0, rotateX: 6, y: 24, transformPerspective: 1200 }}
          animate={{ opacity: 1, rotateX: 0, y: 0 }}
          transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
        >
          {route.page === 'suite' && <Suite />}
          {route.page === 'home' && <Home game={route.game} />}
          {route.page === 'library' && (route.game === 'faces' ? <Faces /> : <CoachLibrary />)}
          {route.page === 'words' && <Reflections />}
          {route.page === 'history' && <History game={route.game} />}
          {route.page === 'session' && <SessionPage id={route.id} game={route.game} />}
          {route.page === 'present' && <Present id={route.id} index={route.index} game={route.game} />}
        </motion.div>
      </main>
      <Toasts />
      <ConfirmDialog />
    </>
  );
}
