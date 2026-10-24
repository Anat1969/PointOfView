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
    name: 'Faces',
    label: 'FACES / פנים והשתקפויות',
    tagline: 'פנים שפוגשות מילה',
    heroLines: ['פנים שפוגשות', 'מילה'],
    about: 'שליפה אקראית של פנים והשתקפויות, הערה לכל קלף, ותצוגה מלאה לקבוצה.',
    forms: [
      { id: 'pairs', label: 'זוגות', hint: 'כל שליפה מניחה זוג: פנים והשתקפות.' },
      { id: 'faces', label: 'פנים', hint: 'כל שליפה מניחה פנים אחת.' },
      { id: 'free', label: 'חופשי', hint: 'שולפים פנים והשתקפויות לפי הצורך.' },
    ],
    defaultForm: 'pairs',
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
      { id: 'stages', label: 'ארבעה שלבים', hint: 'עצירה, הרחבה, מיקוד ועשייה: שולפים קלף לכל שלב.' },
      { id: 'free', label: 'חופשי', hint: 'שולפים קלפים לפי הצורך.' },
    ],
    defaultForm: 'stages',
    libraries: [{ path: 'library', label: 'ספריית קלפים' }],
  },
};

export const GAME_IDS = Object.keys(GAMES) as GameId[];
export const gameOf = (s: Session): GameId => s.game ?? 'faces';
