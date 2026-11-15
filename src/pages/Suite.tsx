import { motion } from 'framer-motion';
import { Tilt } from '../components/Tilt';
import { GAMES, GAME_IDS, gameOf } from '../lib/games';
import { go } from '../lib/router';
import { useStore } from '../lib/store';
import type { GameId } from '../lib/types';
import { useFaceImages } from '../lib/useImages';
import { rise } from './Home';
import { CLARITY_QUESTIONS, CLARITY_WORDS } from '../lib/clarity';
import { Rich } from '../components/Rich';

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
      : game === 'clarity'
        ? [
            { key: 'w', word: CLARITY_WORDS[0] },
            { key: 'p1', url: coach[9] ? urls.get(coach[9].id) : undefined },
            { key: 'q', word: CLARITY_QUESTIONS[0] },
            { key: 'p2', url: coach[22] ? urls.get(coach[22].id) : undefined },
            { key: 'w2', word: CLARITY_WORDS[14] },
          ]
        : coach.slice(0, 5).map((c) => ({ key: c.id, url: urls.get(c.id), caption: c.word }));
  const count =
    game === 'faces' ? `${faces.length} פנים · ${words.length} מילים` : game === 'clarity' ? `${CLARITY_WORDS.length} מילים · ${CLARITY_QUESTIONS.length} שאלות · ${coach.length} תמונות` : `${coach.length} קלפים`;

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


/** ההבדל המקצועי בין הכלים: על איזו שאלה כל כלי עונה, איך הוא עובד, מתי לבחור בו ומה יוצא ממנו */
const COMPARE: { game: GameId; question: string; how: string; when: string; out: string; time: string }[] = [
  {
    game: 'clarity',
    question: 'מה **ברור לי עכשיו**?',
    how: 'שלושה ערוצים שנפגשים במקרה: **מילה** שמכניסה איכות, **שאלה** שמבקשת תשובה כנה, ו**תמונה** שמדברת אל האינטואיציה. הצירוף הלא צפוי עוקף את המחשבה השגרתית.',
    when: 'פתיחת מפגש או צ׳ק־אין, רגע של בלבול, החלטה קטנה, או כשרוצים **תובנה אחת מהירה** לפני עבודה עמוקה.',
    out: 'משפט בהירות אחד וצעד קטן.',
    time: '10 עד 20 דקות',
  },
  {
    game: 'faces',
    question: 'מה **אני מרגיש**, ומה מסתתר מאחורי זה?',
    how: 'עבודה **השלכתית**: מזהים את עצמנו בפנים של אחרים, והשתקפות במילה שנשלפת בעיוורון נותנת לרגש **שם ומשמעות**. שלוש מראות: הפנים של עכשיו, הפנים שמסתתרות, והפנים שרוצים לפגוש.',
    when: 'כשהנושא **רגשי או זהותי**: יחסים, דימוי עצמי, אובדן, כעס, או כשקשה לנסח במילים מה מרגישים.',
    out: 'מודעות רגשית, שפה לרגש, וצעד שנולד מבפנים.',
    time: '30 עד 45 דקות',
  },
  {
    game: 'coaching',
    question: 'מה **עוצר אותי** בדרך למטרה?',
    how: 'עבודה **מערכתית** על פער: מפת שלוש תחנות של אני, **החוסם** והמצב הרצוי. קלפי תמונה ומילה נשלפים בעיוורון, ומשמשים מטאפורה לכל תחנה עד שהחוסם נראה כגשר.',
    when: 'כשיש **מטרה ותקיעות**: קונפליקט עם אדם אחר, החלטה מקצועית, שינוי שלא מצליח לקרות.',
    out: 'הבנת החסם, כרטיס מיקוד ו**מנוף לפעולה** מדיד ותחום בזמן.',
    time: '45 עד 60 דקות',
  },
];

function Compare() {
  return (
    <motion.section className="compare" aria-labelledby="compare-title" {...rise(4)}>
      <span className="label">איזה כלי מתאים לך</span>
      <h2 id="compare-title">
        <Rich text="שלושה כלים, **שלוש שאלות שונות**" />
      </h2>
      <p className="lead">
        <Rich text="כל הכלים עובדים עם תמונות ומילים, וכולם נגמרים ב**התחייבות ובתמונה** שמניעה לפעולה. ההבדל הוא **על איזו שאלה** הכלי עונה, ובאיזה עומק." />
      </p>
      <div className="compare-grid">
        {COMPARE.map((c) => (
          <article key={c.game} className={`compare-card cmp-${c.game}`}>
            <header>
              <span className="label">{GAMES[c.game].tagline}</span>
              <h3>{GAMES[c.game].name}</h3>
              <p className="compare-q">
                <Rich text={c.question} />
              </p>
            </header>
            <dl>
              <dt>איך זה עובד</dt>
              <dd>
                <Rich text={c.how} />
              </dd>
              <dt>מתי לבחור בו</dt>
              <dd>
                <Rich text={c.when} />
              </dd>
              <dt>מה יוצא ממנו</dt>
              <dd>
                <Rich text={c.out} />
              </dd>
              <dt>משך משוער</dt>
              <dd className="mono">{c.time}</dd>
            </dl>
            <button className="btn solid" onClick={() => go(`/${c.game}`)}>
              פתיחת {GAMES[c.game].name}
            </button>
          </article>
        ))}
      </div>
      <div className="compare-path">
        <span className="label">דרך עבודה מומלצת</span>
        <p>
          <Rich text="מתחילים ב**רגע בהירות** כדי למצוא כיוון. אם עולה רגש, ממשיכים ל**פנים**. אם מתבררת מטרה ויש פער, ממשיכים ל**משחק האימון**. אפשר לעבוד עם כלי אחד או לשלב כמה כלים במפגש אחד." />
        </p>
      </div>
    </motion.section>
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
      <Compare />
    </div>
  );
}
