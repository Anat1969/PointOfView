import { useEffect, useState } from 'react';
import { StudioMenu } from './StudioMenu';
import type { Route } from '../lib/router';
import { GAMES, GAME_IDS } from '../lib/games';


export function TopBar({ route }: { route: Route }) {
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [route]);

  // בתוך משחק: הניווט של המשחק. בדף הכלים: רשימת הכלים
  const nav =
    route.page === 'suite'
      ? GAME_IDS.map((g) => ({ href: `#/${g}`, label: GAMES[g].name, active: false }))
      : [
          { href: `#/${route.game}`, label: GAMES[route.game].name, active: route.page === 'home' || route.page === 'session' || route.page === 'present' },
          ...GAMES[route.game].libraries.map((l) => ({ href: `#/${route.game}/${l.path}`, label: l.label, active: route.page === l.path })),
          { href: `#/${route.game}/history`, label: 'היסטוריה', active: route.page === 'history' },
        ];

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a href="#/" className="brand" aria-label="Point of View, דף הכלים">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
          </span>
          <span className="brand-name">Point of View</span>
        </a>

        <StudioMenu />

        <button
          className="menu-toggle btn ghost sm"
          aria-expanded={open}
          aria-controls="topnav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'סגירה' : 'תפריט'}
        </button>

        <nav id="topnav" className={`topnav ${open ? 'open' : ''}`} aria-label="ניווט ראשי">
          <div className="topnav-links">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className={n.active ? 'active' : ''} aria-current={n.active ? 'page' : undefined}>
                {n.label}
              </a>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
