import { motion } from 'framer-motion';
import { Tilt } from '../components/Tilt';
import { GAMES, GAME_IDS, gameOf } from '../lib/games';
import { go } from '../lib/router';
import { useStore } from '../lib/store';
import type { GameId } from '../lib/types';
import { useFaceImages } from '../lib/useImages';
import { rise } from './Home';

/** קופסת משחק בעומק: מכסה, דופן ומניפת קלפים שעולה ממנה */
function GameBox({ game, i }: { game: GameId; i: number }) {
  const cfg = GAMES[game];
  const urls = useFaceImages();
  const faces = useStore((s) => s.faces);
  const coach = useStore((s) => s.coachCards);
  const words = useStore((s) => s.reflections.words);
  const sessions = useStore((s) => s.sessions.filter((x) => gameOf(x) === game).length);
  type Fan = { key: string; url?: string; word?: string; caption?: string };
  const fan: Fan[] =
    game === 'faces'
      ? [...faces.slice(0, 3).map((f) => ({ key: f.id, url: urls.get(f.id) })), ...words.slice(0, 2).map((w) => ({ key: w.id, word: w.text }))]
      : coach.slice(0, 5).map((c) => ({ key: c.id, url: urls.get(c.id), caption: c.word }));
  const count = game === 'faces' ? `${faces.length} פנים · ${words.length} מילים` : `${coach.length} קלפים`;

  return (
    <motion.div className="box-wrap" {...rise(i + 1)}>
      <Tilt className={`game-box box-${game}`} max={8}>
        <button className="box-btn" onClick={() => go(`/${game}`)} aria-label={`כניסה ל${cfg.name}`}>
          <span className="box-fan" aria-hidden="true">
            {fan.map((c, k) => (
              <span key={c.key} className="fan-card" style={{ ['--k' as string]: k - (fan.length - 1) / 2 }}>
                {c.url && <img src={c.url} alt="" />}
                {c.word && <em>{c.word}</em>}
                {c.caption && <b>{c.caption}</b>}
              </span>
            ))}
          </span>
          <span className="box-lid">
            <span className="label">{cfg.label}</span>
            <span className="box-title">{cfg.name}</span>
            <span className="box-tag">{cfg.tagline}</span>
            <span className="mono box-meta">
              {count} · {sessions} סשנים
            </span>
            <span className="box-enter">כניסה</span>
          </span>
          <span className="box-side" aria-hidden="true" />
        </button>
      </Tilt>
    </motion.div>
  );
}

/** דף הכלים של הסדרה: כל משחק עומד בפני עצמו */
export function Suite() {
  return (
    <div className="page suite">
      <motion.header className="suite-head" {...rise(0)}>
        <span className="label">POINT OF VIEW / סדרת כלים</span>
        <h1>
          נקודת מבט
          <br />
          היא כלי עבודה
        </h1>
        <p>כלים לתהליכי התפתחות ושינוי: תמונות ומילים שמחברות בין האינטואיציה לחשיבה. בוחרים כלי ונכנסים.</p>
      </motion.header>
      <section className="boxes">
        {GAME_IDS.map((g, i) => (
          <GameBox key={g} game={g} i={i} />
        ))}
      </section>
    </div>
  );
}
