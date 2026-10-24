import type { GameForm, GameId, Session } from './types';

export type GameConfig = {
  id: GameId;
  name: string;
  label: string;
  tagline: string;
  heroLines: [string, string];
  about: string;
  forms: { id: GameForm; label: string; hint: string }[];
  defaultForm: GameForm;
  /** דפי הספרייה של המשחק, לסרגל הניווט */
  libraries: { path: string; label: string }[];
};

export const GAMES: Record<GameId, GameConfig> = {
  faces: {
    id: 'faces',
    name: 'פנים',
    label: 'פנים / פנים והשתקפויות',
    tagline: 'פנים שפוגשות מילה',
    heroLines: ['פנים שפוגשות', 'מילה'],
    about: 'מסע שלוש מראות: פנים בבחירה גלויה, השתקפות בשליפה עיוורת, תובנה, התחייבות ותמונה שמניעה לפעולה.',
    forms: [
      { id: 'journey', label: 'מסע שלוש מראות', hint: 'נושא, שלושה זוגות של פנים והשתקפות, חקירה, התחייבות ותמונה.' },
      { id: 'pairs', label: 'זוגות', hint: 'כל שליפה מניחה זוג: פנים והשתקפות.' },
      { id: 'faces', label: 'פנים בלבד', hint: 'כל שליפה מניחה פנים אחת.' },
      { id: 'free', label: 'חופשי', hint: 'שולפים פנים והשתקפויות לפי הצורך.' },
    ],
    defaultForm: 'journey',
    libraries: [
      { path: 'library', label: 'ספריית פנים' },
      { path: 'words', label: 'השתקפויות' },
    ],
  },
  coaching: {
    id: 'coaching',
    name: 'משחק האימון',
    label: 'THE COACHING GAME / משחק האימון',
    tagline: 'תמונה ומילה שפותחות דרך',
    heroLines: ['תמונה ומילה', 'פותחות דרך'],
    about: 'קלפים של תמונה ומילה שמחברים בין האינטואיציה לחשיבה, ומאיצים מחקר פנימי, שינוי נקודת מבט ותובנות חדשות.',
    forms: [
      { id: 'journey', label: 'מפת שלוש תחנות', hint: 'נושא, בחירה עיוורת של שלושה קלפים, חקירת התחנות, מנוף לפעולה ותמונה.' },
      { id: 'free', label: 'חופשי', hint: 'שולפים קלפים לפי הצורך.' },
    ],
    defaultForm: 'journey',
    libraries: [{ path: 'library', label: 'ספריית קלפים' }],
  },
};

export const GAME_IDS = Object.keys(GAMES) as GameId[];
export const gameOf = (s: Session): GameId => s.game ?? 'faces';
