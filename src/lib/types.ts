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

export type Reflections = { words: Word[]; blanks: number };

export type CardKind = 'face' | 'reflection';

export type SessionCard = {
  id: string;
  kind: CardKind;
  /** מזהה פנים, מזהה מילה, או blank-N לקלף ריק */
  refId: string;
  /** תמונת מצב של המילה בזמן השליפה, כדי שהיסטוריה לא תשתנה כשעורכים את הספרייה */
  text?: string;
  note: string;
};

export type SessionMode = 'personal' | 'group';

export type Session = {
  id: string;
  title: string;
  mode: SessionMode;
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
