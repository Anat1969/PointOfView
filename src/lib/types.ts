export type Face = {
  id: string;
  name: string;
  /** קובץ בדלי faces-media */
  image_path?: string | null;
  /** מספר דיוקן מאויר מערכת הפתיחה */
  starter?: number | null;
  sort?: number;
};

export type Word = { id: string; text: string; sort?: number };

/** קלף משחק האימון: תמונה ומילה על אותו קלף */
export type CoachCard = {
  id: string;
  word: string;
  image_path?: string | null;
  starter?: number | null;
  sort?: number;
};

export type GameId = 'faces' | 'coaching';

export type Reflections = { words: Word[]; blanks: number };

export type CardKind = 'face' | 'reflection' | 'coach';

export type SessionCard = {
  id: string;
  kind: CardKind;
  /** מזהה פנים, מזהה מילה, או blank-N לקלף ריק */
  refId: string;
  /** תמונת מצב של המילה בזמן השליפה, כדי שהיסטוריה לא תשתנה כשעורכים את הספרייה */
  text?: string;
  note: string;
  /** מזהה זוג: פנים והשתקפות שנשלפו יחד */
  pair?: string;
  /** עמדה בתהליך המודרך: במשחק האימון 0 אני, 1 האחר או הרצוי, 2 החוסם. בפנים 0 עכשיו, 1 מסתתרות, 2 רוצה לפגוש */
  stage?: number;
};

/** צורת המשחק קובעת מה נשלף ואיך השולחן מסודר */
export type GameForm = 'pairs' | 'faces' | 'free' | 'journey';

export type SessionMode = 'personal' | 'group';

export type Session = {
  id: string;
  /** סשנים ישנים בלי שדה זה שייכים לפנים */
  game?: GameId;
  title: string;
  mode: SessionMode;
  form?: GameForm;
  /** תהליך משחק האימון: השלב הנוכחי, הנושא, הפיכת הקלפים, התובנה, כרטיס המיקוד וההתחייבות */
  step?: number;
  topic?: string;
  flipped?: boolean;
  insight?: string;
  focus?: number;
  action?: { what: string; when: string; measure: string; /** תאריך יעד YYYY-MM-DD */ due?: string };
  /** תמונת ההתחייבות: נבנית מהסשן בפרומפט, ונשמרת בדלי faces-media */
  vision?: { path: string; distill: string; prompt: string; title?: string; at: number };
  /** סגירת המעגל: ההתחייבות בוצעה, ומה קרה כשעשיתי */
  done?: { at: number; note: string };
  participants: string;
  summary: string;
  cards: SessionCard[];
  createdAt: number;
  updatedAt: number;
};

export const MAX_FACES = 99;
export const MAX_REFLECTIONS = 58;
export const MAX_BLANKS = 8;
export const MAX_WORDS = MAX_REFLECTIONS - MAX_BLANKS;
export const MAX_COACH = 99;
