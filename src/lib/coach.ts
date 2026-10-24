// ערכת פתיחה מקורית למשחק האימון: איורים אדריכליים־מטפוריים שנוצרים מקוד, ומילה לכל קלף
import type { CoachCard } from './types';

export const COACH_COUNT = 65;

export const COACH_WORDS = [
  'אפשרות', 'מעבר', 'פתיחות', 'צעד', 'חיבור', 'אופק', 'שורשים', 'מסע', 'עלייה', 'שער',
  'מנוחה', 'אמת', 'גבולות', 'הזדמנות', 'ויתור', 'בהירות', 'סבלנות', 'תנועה', 'איזון', 'החלטה',
  'נקודת מבט', 'מרחב', 'זמן', 'אור', 'צל', 'עומק', 'קלילות', 'אחיזה', 'שחרור', 'כיוון',
  'מפגש', 'קשב', 'דמיון', 'כוונה', 'משאב', 'תמיכה', 'תעוזה', 'ספקנות', 'ציפייה', 'התחדשות',
  'פשטות', 'מורכבות', 'יציבות', 'זרימה', 'משמעות', 'ערכים', 'חזון', 'מחויבות', 'הודיה', 'שקט פנימי',
  'קשר', 'גמישות', 'למידה', 'טעות', 'הצלחה', 'חשש', 'משאלה', 'מקום', 'דרך חדשה', 'נשימה',
  'ראייה', 'נוכחות', 'השראה', 'פריחה', 'בחירה חופשית',
];

/** מפת שלוש התחנות: הסבר, שאלות מובילות ודוגמה לכל תחנה (לפי חוקי המשחק שענת הגדירה) */
export const STATIONS = [
  {
    name: 'אני',
    title: 'איפה אני נמצא כרגע בנושא?',
    explain: 'הקלף מייצג את החוויה הנוכחית של המתאמן.',
    questions: ['מה אתה רואה בתמונה שמתחבר להרגשה שלך כרגע?', 'איך המילה שכתובה על הקלף פוגשת אותך?'],
    example: 'תמונה של אדם לבד במדבר והמילה "בדידות". התובנה: "אני מרגיש שאף אחד לא תומך בהחלטות המקצועיות שלי".',
  },
  {
    name: 'האחר / המצב הרצוי',
    title: 'מה המטרה, או מי הצד השני?',
    explain: 'הקלף מייצג את היעד, או את האדם שמולו מתנהל הקונפליקט.',
    questions: ['מה משתנה בתחושה שלך כשאתה מביט בקלף הזה?', 'מה יש בתמונה הזו שאתה רוצה שיקרה במציאות?'],
    example: 'תמונה של להקת ציפורים עפה והמילה "חופש". התובנה: "אני לא מחפש רק כסף, אני מחפש עצמאות ומרחב פעולה".',
  },
  {
    name: 'החוסם / מה שביניהם',
    title: 'מה מונע ממני להגיע לשם?',
    explain: 'גשר התובנה שמחבר בין המצוי לרצוי.',
    questions: ['איך הקלף הזה מסביר את התקיעות שלך?', 'קרא את שורת ההשראה של המילה הזו: מה קופץ לך לעין?'],
    example: 'תמונה של חבלים קשורים והמילה "מחויבות". התובנה: "מה שחוסם אותי זה לא חוסר כסף, אלא הפחד לאכזב את ההורים שלי".',
  },
] as const;

/** סדר העמדות במפה, מימין לשמאל: אני, החוסם כגשר באמצע, הרצוי */
export const MAP_ORDER = [0, 2, 1] as const;

/** כרטיסי מיקוד: שאלות קצרות לפעולה. נוסח מקורי */
export const FOCUS_CARDS = [
  'מהו הדבר הקטן ביותר שאוכל לעשות כבר מחר?',
  'מה אעשה ב-24 השעות הקרובות?',
  'מה אנסה במשך שבוע אחד בלבד?',
  'איזו שיחה אני דוחה, ומתי אקיים אותה?',
  'את מי אני צריך לפגוש או לשאול?',
  'ממה אני מוכן לוותר כדי להתקדם?',
  'מה אפסיק לעשות מהיום?',
  'מה אני כבר יודע לעשות שיעזור לי כאן?',
  'איך ייראה הצעד הראשון אם לא אפחד?',
  'איזה משאב חסר לי, ואיך אשיג אותו?',
  'מי יכול ללוות אותי בצעד הזה?',
  'מה הגרסה הפשוטה ביותר של הפתרון?',
  'איך אדע שהתקדמתי?',
  'מה יעזור לי לעמוד בהתחייבות?',
  'מה אגיד לעצמי כשאתקל בקושי?',
  'איזה הרגל קטן אכניס לשגרה?',
];

/** שורת השראה לכל מילה: נוסח מקורי, במקום ספר ההשראה של המשחק המקורי */
export const INSPIRATION: Record<string, string> = {
  'אפשרות': 'כל דלת סגורה היא גם קיר שעוד לא ניסינו לגעת בו.',
  'מעבר': 'בין מה שהיה למה שיהיה יש מסדרון. מותר לעצור בו לנשום.',
  'פתיחות': 'מה שאני לא מוכן לשמוע הוא לפעמים בדיוק מה שאני צריך לדעת.',
  'צעד': 'הדרך לא מתקצרת כשמסתכלים עליה. היא מתקצרת כשהולכים.',
  'חיבור': 'גשר לא מבטל את המרחק. הוא מאפשר לעבור אותו.',
  'אופק': 'האופק זז איתנו, וזה בדיוק מה שמאפשר להמשיך ללכת.',
  'שורשים': 'ככל שהשורשים עמוקים יותר, אפשר לצמוח גבוה יותר.',
  'מסע': 'המסע לא מתחיל כשיוצאים. הוא מתחיל כשמחליטים.',
  'עלייה': 'כל מדרגה נראית קטנה רק כשמסתכלים עליה מלמעלה.',
  'שער': 'שער פתוח עדיין מחכה שמישהו יעבור בו.',
  'מנוחה': 'גם שדה זקוק לשנת שמיטה כדי לתת פרי.',
  'אמת': 'האמת לא תמיד נוחה, אבל היא תמיד מקום יציב לעמוד עליו.',
  'גבולות': 'גבול טוב הוא לא חומה. הוא קו שמאפשר לשני הצדדים לנשום.',
  'הזדמנות': 'הזדמנות לא דופקת פעמיים. לפעמים היא מחכה שנפתח חלון.',
  'ויתור': 'כשמניחים משהו, הידיים מתפנות לאחוז במשהו אחר.',
  'בהירות': 'כשהמים נרגעים, רואים את הקרקעית.',
  'סבלנות': 'עץ לא גדל מהר יותר כשמושכים בענפים.',
  'תנועה': 'גם צעד קטן הצידה משנה את כל נקודת המבט.',
  'איזון': 'איזון הוא לא עמידה במקום. הוא תיקון מתמיד.',
  'החלטה': 'גם לא להחליט זו החלטה. רק בלי בעלים.',
  'נקודת מבט': 'אותו הר נראה אחרת מכל צד של העמק.',
  'מרחב': 'לפעמים כדי לגדול צריך קודם לפנות מקום.',
  'זמן': 'הזמן לא מחכה, אבל הוא גם לא ממהר. אנחנו ממהרים.',
  'אור': 'אור לא נלחם בחושך. הוא פשוט נדלק.',
  'צל': 'איפה שיש צל, יש גם מקור אור.',
  'עומק': 'מה שעל פני השטח מסתיר את מה שמחזיק את הכל.',
  'קלילות': 'לא כל דבר כבד צריך להיסחב לבד.',
  'אחיזה': 'אחיזה טובה מספיק חזקה כדי להחזיק ומספיק רפויה כדי לשחרר.',
  'שחרור': 'אי אפשר לפתוח יד קפוצה ולקבל בה משהו חדש.',
  'כיוון': 'כשיודעים לאן, גם רוח נגדית הופכת למפרש.',
  'מפגש': 'במפגש אמיתי שני הצדדים יוצאים קצת אחרים.',
  'קשב': 'לפעמים המשפט החשוב ביותר נאמר בשתיקה.',
  'דמיון': 'כל מה שנבנה התחיל פעם כתמונה בראש של מישהו.',
  'כוונה': 'כוונה ברורה הופכת פעולה קטנה לצעד בדרך.',
  'משאב': 'מה שיש לי כבר עכשיו גדול ממה שאני זוכר.',
  'תמיכה': 'גם הקיר החזק ביותר נשען על יסודות.',
  'תעוזה': 'האומץ לא מגיע לפני הצעד. הוא נולד בתוכו.',
  'ספקנות': 'ספק טוב הוא שאלה, לא תשובה.',
  'ציפייה': 'ציפייה שלא נאמרה בקול היא חוזה שרק צד אחד חתם עליו.',
  'התחדשות': 'גם עץ ישן מוציא בכל אביב עלים חדשים.',
  'פשטות': 'הפתרון הפשוט נמצא לרוב אחרי שמורידים את מה שמיותר.',
  'מורכבות': 'במבוך, כל צעד שגוי מלמד איפה לא לחפש.',
  'יציבות': 'בית יציב בנוי על יסודות שאיש לא רואה.',
  'זרימה': 'נהר לא שובר את הסלע. הוא מוצא דרך סביבו.',
  'משמעות': 'כשיש למה, כמעט כל איך אפשרי.',
  'ערכים': 'ערכים הם מצפן, לא מפה. הם מראים כיוון, לא דרך.',
  'חזון': 'חזון הוא לראות את הבניין עוד לפני שהונחה האבן הראשונה.',
  'מחויבות': 'למי אני באמת מחויב: לציפיות של אחרים, או לדרך שלי?',
  'הודיה': 'מה שאני מודה עליו, גדל.',
  'שקט פנימי': 'השקט לא נמצא בחוץ. הוא מחכה מתחת לרעש.',
  'קשר': 'קשר חי צריך גם מרחק וגם קרבה.',
  'גמישות': 'ענף שמתכופף ברוח לא נשבר.',
  'למידה': 'מי שמפסיק ללמוד מתחיל להזדקן, בכל גיל.',
  'טעות': 'טעות היא מידע שהגיע בצורה לא נוחה.',
  'הצלחה': 'הצלחה היא לא נקודה בסוף הדרך. היא האופן שבו הולכים.',
  'חשש': 'הפחד שואל שאלה חשובה. לא חייבים לתת לו את ההגה.',
  'משאלה': 'משאלה שנכתבת הופכת לתוכנית.',
  'מקום': 'יש מקומות שלא מגיעים אליהם. בונים אותם.',
  'דרך חדשה': 'שביל נוצר מצעדים של מי שהעזו ללכת בו ראשונים.',
  'נשימה': 'בין גירוי לתגובה יש נשימה אחת. בה נמצאת הבחירה.',
  'ראייה': 'מה שאני מחפש משנה את מה שאני רואה.',
  'נוכחות': 'להיות כאן עכשיו זו המתנה הכי נדירה.',
  'השראה': 'השראה מגיעה לרוב כשכבר עובדים.',
  'פריחה': 'כל פרח היה פעם זרע שהאמין באור.',
  'בחירה חופשית': 'גם כשאין שליטה במצב, יש שליטה ביחס אליו.',
};

function rng(seed: number) {
  let a = seed * 2246822519;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f = (v: number) => Math.round(v * 10) / 10;

// חמש תאורות: שחר, צהריים, שקיעה, לילה, ערפל
const SKIES = [
  { top: '#f4d9c4', mid: '#e7b9a0', low: '#c9a7a4', ground: '#6f6658', sun: '#fff1dc', ink: '#3b3530' },
  { top: '#bcd3e3', mid: '#dbe6ec', low: '#eef1ee', ground: '#7d8a76', sun: '#ffffff', ink: '#2f3a40' },
  { top: '#3c4a6b', mid: '#c27563', low: '#efb27f', ground: '#3f3a33', sun: '#ffd6a0', ink: '#221d1c' },
  { top: '#0f1a2c', mid: '#23466b', low: '#3d5f80', ground: '#141b24', sun: '#f2efe6', ink: '#0b0f15' },
  { top: '#d9dcdc', mid: '#c9cdcc', low: '#b9bebd', ground: '#8a8f8c', sun: '#f4f4f2', ink: '#4a4f4e' },
];

const MOTIFS = ['door', 'window', 'stairs', 'bridge', 'path', 'horizon', 'mountain', 'tree', 'boat', 'ladder', 'maze', 'arch', 'chair'] as const;

/** איור אדריכלי־מטפורי. n קבוע, ולכן אותו איור חוזר תמיד */
export function coachSvg(n: number): string {
  const r = rng(n + 101);
  const motif = MOTIFS[(n - 1) % MOTIFS.length];
  // 13 ו-5 זרים זה לזה: כל צירוף של מוטיב ותאורה מופיע פעם אחת, וקלפים סמוכים שונים בתאורה
  const sky = SKIES[(n - 1) % SKIES.length];
  const id = `c${n}`;
  const hz = 430 + r() * 70; // קו אופק
  const sunX = 90 + r() * 320;
  const sunY = hz - 120 - r() * 160;
  const night = sky === SKIES[3];
  const ink = sky.ink;
  const lit = night ? '#f2d38b' : '#fff8ec';
  let scene = '';

  switch (motif) {
    case 'door': {
      const w = 150 + r() * 40, h = 300 + r() * 40, x = 250 - w / 2, y = hz - h + 40;
      const ajar = 0.35 + r() * 0.4;
      scene = `<rect x="40" y="${f(y - 60)}" width="420" height="${f(h + 100)}" fill="${ink}" opacity=".88"/>
        <rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="url(#${id}glow)"/>
        <path d="M${f(x)} ${f(y)} L${f(x + w * ajar)} ${f(y + 18)} L${f(x + w * ajar)} ${f(y + h + 10)} L${f(x)} ${f(y + h)} Z" fill="${ink}" stroke="#000" stroke-opacity=".3"/>
        <circle cx="${f(x + w * ajar - 12)}" cy="${f(y + h * 0.55)}" r="5" fill="${lit}" opacity=".8"/>
        <path d="M${f(x)} ${f(y + h)} L${f(x - 60)} 700 L${f(x + w + 60)} 700 L${f(x + w)} ${f(y + h)} Z" fill="${lit}" opacity=".35"/>`;
      break;
    }
    case 'window': {
      const w = 230, h = 300, x = 135, y = 150 + r() * 40;
      scene = `<rect width="500" height="700" fill="${ink}" opacity=".85"/>
        <rect x="${x}" y="${f(y)}" width="${w}" height="${h}" fill="url(#${id}sky)"/>
        <circle cx="${f(x + 60 + r() * 110)}" cy="${f(y + 80 + r() * 60)}" r="34" fill="${sky.sun}" opacity=".9"/>
        <path d="M${x} ${f(y + h * 0.72)} Q${x + 70} ${f(y + h * 0.6)} ${x + 130} ${f(y + h * 0.7)} T${x + w} ${f(y + h * 0.66)} L${x + w} ${f(y + h)} L${x} ${f(y + h)} Z" fill="${sky.ground}" opacity=".8"/>
        <path d="M${x + w / 2} ${f(y)} V${f(y + h)} M${x} ${f(y + h / 2)} H${x + w}" stroke="${ink}" stroke-width="10"/>
        <rect x="${x - 10}" y="${f(y - 10)}" width="${w + 20}" height="${h + 20}" fill="none" stroke="${ink}" stroke-width="14"/>
        <path d="M${x} ${f(y + h)} L${x - 80} 700 L${x + w + 80} 700 L${x + w} ${f(y + h)} Z" fill="${lit}" opacity=".18"/>
        <rect x="${x - 30}" y="${f(y + h + 8)}" width="${w + 60}" height="16" fill="${ink}"/>`;
      break;
    }
    case 'stairs': {
      const steps = 7 + Math.floor(r() * 4);
      const sw = 300 / steps;
      scene = Array.from({ length: steps }, (_, i) => {
        const x = 100 + i * sw, y = hz + 140 - i * 34;
        return `<rect x="${f(x)}" y="${f(y)}" width="${f(sw + 1)}" height="${f(700 - y)}" fill="${ink}" opacity="${f(0.55 + i * 0.04)}"/><rect x="${f(x)}" y="${f(y)}" width="${f(sw + 1)}" height="5" fill="${lit}" opacity=".5"/>`;
      }).join('') + `<circle cx="${f(100 + steps * sw - 10)}" cy="${f(hz + 140 - steps * 34 - 22)}" r="9" fill="${ink}"/><rect x="${f(100 + steps * sw - 16)}" y="${f(hz + 140 - steps * 34 - 14)}" width="12" height="24" rx="5" fill="${ink}"/>`;
      break;
    }
    case 'bridge': {
      const y = hz + 20;
      scene = `<rect x="0" y="${f(hz)}" width="500" height="${f(700 - hz)}" fill="url(#${id}water)"/>
        <path d="M-10 ${f(y)} Q250 ${f(y - 120 - r() * 60)} 510 ${f(y)}" stroke="${ink}" stroke-width="14" fill="none"/>
        <path d="M-10 ${f(y - 10)} H510" stroke="${ink}" stroke-width="10"/>
        ${Array.from({ length: 11 }, (_, i) => `<path d="M${f(-10 + i * 52)} ${f(y - 10)} V${f(y - 10 - Math.sin((i / 10) * Math.PI) * 100)}" stroke="${ink}" stroke-width="3"/>`).join('')}
        <rect x="70" y="${f(y - 10)}" width="16" height="${f(700 - y)}" fill="${ink}"/><rect x="414" y="${f(y - 10)}" width="16" height="${f(700 - y)}" fill="${ink}"/>
        <path d="M-10 ${f(y + 30)} H510" stroke="${lit}" stroke-width="2" opacity=".35"/>`;
      break;
    }
    case 'path': {
      const bend = (r() - 0.5) * 240;
      scene = `<rect x="0" y="${f(hz)}" width="500" height="${f(700 - hz)}" fill="${sky.ground}"/>
        <path d="M150 700 Q${f(250 + bend)} ${f(hz + 120)} ${f(250 + bend / 3)} ${f(hz)} L${f(258 + bend / 3)} ${f(hz)} Q${f(270 + bend)} ${f(hz + 120)} 380 700 Z" fill="${lit}" opacity=".75"/>
        ${Array.from({ length: 8 }, () => `<ellipse cx="${f(30 + r() * 440)}" cy="${f(hz + 30 + r() * 220)}" rx="${f(14 + r() * 26)}" ry="${f(6 + r() * 8)}" fill="${ink}" opacity=".25"/>`).join('')}`;
      break;
    }
    case 'horizon': {
      scene = `<rect x="0" y="${f(hz)}" width="500" height="${f(700 - hz)}" fill="url(#${id}water)"/>
        <path d="M${f(sunX - 60)} ${f(hz + 10)} H${f(sunX + 60)} M${f(sunX - 40)} ${f(hz + 30)} H${f(sunX + 40)} M${f(sunX - 22)} ${f(hz + 52)} H${f(sunX + 22)}" stroke="${sky.sun}" stroke-width="4" opacity=".6"/>
        <path d="M500 ${f(hz + 150)} L${f(250 + r() * 60)} ${f(hz + 96)} L${f(250 + r() * 60)} ${f(hz + 104)} L500 ${f(hz + 170)} Z" fill="${ink}"/>
        <rect x="${f(262)}" y="${f(hz + 70)}" width="9" height="28" rx="4" fill="${ink}"/><circle cx="266.5" cy="${f(hz + 62)}" r="7" fill="${ink}"/>`;
      break;
    }
    case 'mountain': {
      const p = (o: number, h: number, c: string, op: number) => `<path d="M${-50 + o} ${f(hz + 60)} L${f(140 + o + r() * 60)} ${f(hz - h)} L${f(330 + o)} ${f(hz + 60)} Z" fill="${c}" opacity="${op}"/>`;
      scene = p(150, 170 + r() * 80, ink, 0.45) + p(-60, 230 + r() * 80, ink, 0.7) + p(260, 140, ink, 0.6) + `<rect x="0" y="${f(hz + 58)}" width="500" height="${f(700 - hz)}" fill="${sky.ground}"/>
        <path d="M${f(200)} ${f(hz + 60)} L${f(206)} ${f(hz + 40)}" stroke="${lit}" stroke-width="3"/>`;
      break;
    }
    case 'tree': {
      const tx = 180 + r() * 140;
      scene = `<rect x="0" y="${f(hz)}" width="500" height="${f(700 - hz)}" fill="${sky.ground}"/>
        <path d="M${f(tx - 10)} ${f(hz + 40)} Q${f(tx - 4)} ${f(hz - 80)} ${f(tx - 30)} ${f(hz - 180)} M${f(tx)} ${f(hz - 60)} Q${f(tx + 40)} ${f(hz - 120)} ${f(tx + 70)} ${f(hz - 200)}" stroke="${ink}" stroke-width="18" fill="none" stroke-linecap="round"/>
        ${Array.from({ length: 9 }, () => `<circle cx="${f(tx - 80 + r() * 170)}" cy="${f(hz - 260 + r() * 130)}" r="${f(50 + r() * 40)}" fill="${ink}" opacity="${f(0.55 + r() * 0.3)}"/>`).join('')}
        <path d="M${f(tx - 10)} ${f(hz + 40)} q-40 30 -90 34 M${f(tx - 6)} ${f(hz + 40)} q30 36 80 40" stroke="${ink}" stroke-width="8" fill="none" opacity=".7"/>`;
      break;
    }
    case 'boat': {
      const bx = 140 + r() * 160;
      scene = `<rect x="0" y="${f(hz)}" width="500" height="${f(700 - hz)}" fill="url(#${id}water)"/>
        <path d="M${f(bx - 70)} ${f(hz + 70)} Q${f(bx)} ${f(hz + 110)} ${f(bx + 80)} ${f(hz + 66)} L${f(bx + 60)} ${f(hz + 90)} Q${f(bx)} ${f(hz + 116)} ${f(bx - 52)} ${f(hz + 92)} Z" fill="${ink}"/>
        <path d="M${f(bx)} ${f(hz + 70)} V${f(hz - 120)}" stroke="${ink}" stroke-width="4"/>
        <path d="M${f(bx + 4)} ${f(hz - 116)} L${f(bx + 70)} ${f(hz + 50)} L${f(bx + 4)} ${f(hz + 50)} Z" fill="${lit}" opacity=".85"/>
        <path d="M${f(bx - 90)} ${f(hz + 118)} Q${f(bx)} ${f(hz + 126)} ${f(bx + 100)} ${f(hz + 114)}" stroke="${lit}" stroke-width="2" opacity=".4" fill="none"/>`;
      break;
    }
    case 'ladder': {
      const lx = 190 + r() * 60, top = 80 + r() * 60;
      scene = `<rect x="0" y="${f(hz)}" width="500" height="${f(700 - hz)}" fill="${sky.ground}"/>
        <path d="M${f(lx)} 640 L${f(lx + 30)} ${f(top)} M${f(lx + 90)} 640 L${f(lx + 100)} ${f(top)}" stroke="${ink}" stroke-width="9"/>
        ${Array.from({ length: 12 }, (_, i) => { const t = i / 11; const y = 620 - t * (620 - top - 20); return `<path d="M${f(lx + 30 * (1 - (y - top) / (640 - top)))} ${f(y)} H${f(lx + 90 + 10 * (1 - (y - top) / (640 - top)))}" stroke="${ink}" stroke-width="6"/>`; }).join('')}
        <ellipse cx="${f(lx + 60)}" cy="${f(top - 10)}" rx="70" ry="22" fill="${lit}" opacity=".5" filter="url(#${id}blur)"/>`;
      break;
    }
    case 'maze': {
      const g = 9, s = 38, ox = 250 - (g * s) / 2, oy = hz - 40;
      let walls = '';
      for (let i = 0; i < g; i++)
        for (let j = 0; j < g; j++) {
          if (r() < 0.5) walls += `M${f(ox + i * s)} ${f(oy + j * s * 0.5)} h${s}`;
          else walls += `M${f(ox + i * s)} ${f(oy + j * s * 0.5)} v${f(s * 0.5)}`;
        }
      scene = `<rect x="0" y="${f(hz - 40)}" width="500" height="${f(740 - hz)}" fill="${sky.ground}"/>
        <g transform="translate(0 0)"><path d="${walls}" stroke="${ink}" stroke-width="7" stroke-linecap="square" fill="none" opacity=".85"/></g>
        <circle cx="${f(ox + g * s - s / 2)}" cy="${f(oy + g * s * 0.5 - 10)}" r="8" fill="${lit}"/>`;
      break;
    }
    case 'arch': {
      const w = 200, x = 150, y = hz - 220;
      scene = `<rect x="0" y="${f(hz)}" width="500" height="${f(700 - hz)}" fill="${sky.ground}"/>
        <path d="M${x - 50} ${f(hz + 60)} V${f(y)} A${w / 2 + 50} ${w / 2 + 50} 0 0 1 ${x + w + 50} ${f(y)} V${f(hz + 60)} H${x + w} V${f(y)} A${w / 2} ${w / 2} 0 0 0 ${x} ${f(y)} V${f(hz + 60)} Z" fill="${ink}"/>
        <path d="M${x} ${f(hz + 60)} L${x - 40} 700 L${x + w + 40} 700 L${x + w} ${f(hz + 60)} Z" fill="${lit}" opacity=".3"/>`;
      break;
    }
    case 'chair': {
      const cx = 200 + r() * 100;
      scene = `<rect x="0" y="${f(hz)}" width="500" height="${f(700 - hz)}" fill="${sky.ground}"/>
        <ellipse cx="${f(cx + 20)}" cy="${f(hz + 152)}" rx="90" ry="12" fill="#000" opacity=".25"/>
        <path d="M${f(cx - 50)} ${f(hz + 150)} V${f(hz + 60)} H${f(cx + 50)} V${f(hz + 150)} M${f(cx + 50)} ${f(hz + 60)} V${f(hz - 60)}" stroke="${ink}" stroke-width="9" fill="none"/>
        <rect x="${f(cx - 58)}" y="${f(hz + 52)}" width="116" height="14" fill="${ink}"/>
        <rect x="${f(cx + 40)}" y="${f(hz - 64)}" width="14" height="110" fill="${ink}"/>`;
      break;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 700" width="500" height="700">
<defs>
  <linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky.top}"/><stop offset=".6" stop-color="${sky.mid}"/><stop offset="1" stop-color="${sky.low}"/></linearGradient>
  <linearGradient id="${id}water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky.low}"/><stop offset="1" stop-color="${sky.ground}"/></linearGradient>
  <radialGradient id="${id}glow" cx=".5" cy=".6" r=".7"><stop offset="0" stop-color="${lit}"/><stop offset="1" stop-color="${sky.mid}"/></radialGradient>
  <filter id="${id}blur"><feGaussianBlur stdDeviation="12"/></filter>
  <filter id="${id}grain" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${n}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .08 0"/><feComposite in2="SourceGraphic" operator="in"/><feBlend in="SourceGraphic" mode="multiply"/></filter>
</defs>
<g filter="url(#${id}grain)">
  <rect width="500" height="700" fill="url(#${id}sky)"/>
  ${night ? Array.from({ length: 30 }, () => `<circle cx="${f(r() * 500)}" cy="${f(r() * hz * 0.8)}" r="${f(0.6 + r() * 1.4)}" fill="#fff" opacity="${f(0.4 + r() * 0.5)}"/>`).join('') : ''}
  <circle cx="${f(sunX)}" cy="${f(sunY)}" r="${night ? 30 : 46}" fill="${sky.sun}" opacity=".95"/>
  <circle cx="${f(sunX)}" cy="${f(sunY)}" r="110" fill="${sky.sun}" opacity=".18" filter="url(#${id}blur)"/>
  ${scene}
</g>
</svg>`;
}

export const coachId = (n: number) => `coach-${n}`;
const cache = new Map<number, string>();
export function coachStarterUrl(n: number) {
  if (!cache.has(n)) cache.set(n, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(coachSvg(n)));
  return cache.get(n)!;
}

export function coachStarterCards(): CoachCard[] {
  return COACH_WORDS.map((word, i) => ({ id: coachId(i + 1), word, starter: i + 1, image_path: null, sort: i + 1 }));
}
