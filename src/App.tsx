import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { ConfirmDialog, Toasts } from './components/Feedback';
import { TopBar } from './components/TopBar';
import { useRoute } from './lib/router';
import { Faces } from './pages/Faces';
import { History } from './pages/History';
import { Home } from './pages/Home';
import { Present } from './pages/Present';
import { Reflections } from './pages/Reflections';
import { SessionPage } from './pages/SessionPage';

const TITLES: Record<string, string> = {
  home: 'Faces',
  faces: 'ספריית פנים · Faces',
  reflections: 'השתקפויות · Faces',
  history: 'היסטוריה · Faces',
  session: 'סשן · Faces',
  present: 'תצוגת קבוצה · Faces',
};

export function App() {
  const route = useRoute();
  useEffect(() => {
    document.title = TITLES[route.page];
    if (route.page !== 'present') window.scrollTo({ top: 0 });
  }, [route.page]);

  const pageKey = route.page === 'session' || route.page === 'present' ? `${route.page}-${route.id}` : route.page;

  return (
    <>
      <div className="backdrop" aria-hidden="true">
        <span className="plane p1" />
        <span className="plane p2" />
        <span className="plane p3" />
      </div>
      <TopBar route={route} />
      <main className={route.page === 'present' ? 'main present-main' : 'main'}>
        <AnimatePresence mode="wait">
          <motion.div
            key={pageKey}
            initial={{ opacity: 0, rotateX: 6, y: 24, transformPerspective: 1200 }}
            animate={{ opacity: 1, rotateX: 0, y: 0 }}
            exit={{ opacity: 0, rotateX: -4, y: -12 }}
            transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {route.page === 'home' && <Home />}
            {route.page === 'faces' && <Faces />}
            {route.page === 'reflections' && <Reflections />}
            {route.page === 'history' && <History />}
            {route.page === 'session' && <SessionPage id={route.id} />}
            {route.page === 'present' && <Present id={route.id} index={route.index} />}
          </motion.div>
        </AnimatePresence>
      </main>
      <Toasts />
      <ConfirmDialog />
    </>
  );
}
