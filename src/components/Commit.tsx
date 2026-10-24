import { Dictate, appendText } from './Dictate';
import type { Session } from '../lib/types';

type Action = NonNullable<Session['action']>;

/** ההתחייבות: קונקרטית, מדידה ותחומה בזמן. משותף לשני המשחקים */
export function Commit({ action, setAction }: { action: Action; setAction: (p: Partial<Action>) => void }) {
  return (
    <>
      <label className="label" htmlFor="act-what">
        מה אעשה
      </label>
      <div className="voice-box">
        <textarea id="act-what" rows={3} placeholder="למשל: אקבע פגישת ייעוץ ראשונית של חצי שעה עם רואה חשבון" value={action.what} onChange={(e) => setAction({ what: e.target.value })} />
        <Dictate inside label="הפעולה" onText={(t) => setAction({ what: appendText(action.what, t) })} />
      </div>
      <div className="commit-when">
        <div>
          <label className="label" htmlFor="act-when">
            מתי
          </label>
          <div className="voice-row">
            <input id="act-when" placeholder="למשל: ביום ראשון ב-10:00" value={action.when} onChange={(e) => setAction({ when: e.target.value })} />
            <Dictate label="מתי" onText={(t) => setAction({ when: appendText(action.when, t) })} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="act-due">
            תאריך יעד
          </label>
          <input id="act-due" type="date" value={action.due ?? ''} onChange={(e) => setAction({ due: e.target.value })} />
        </div>
      </div>
      <label className="label" htmlFor="act-measure">
        איך אדע שעשיתי
      </label>
      <div className="voice-row">
        <input id="act-measure" placeholder="למשל: הפגישה נקבעה ביומן" value={action.measure} onChange={(e) => setAction({ measure: e.target.value })} />
        <Dictate label="איך אדע" onText={(t) => setAction({ measure: appendText(action.measure, t) })} />
      </div>
      <div className="checks" aria-label="בדיקת ההתחייבות">
        <span className={action.what.trim() ? 'ok' : ''}>קונקרטית</span>
        <span className={action.measure.trim() ? 'ok' : ''}>מדידה</span>
        <span className={action.when.trim() || action.due ? 'ok' : ''}>תחומה בזמן</span>
      </div>
    </>
  );
}

/** כמה ימים נשארו עד תאריך היעד. שלילי: עבר המועד */
export function daysLeft(due?: string): number | null {
  if (!due) return null;
  const d = new Date(`${due}T23:59:59`);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${due}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function dueLabel(due?: string): string {
  const n = daysLeft(due);
  if (n === null) return '';
  if (n === 0) return 'היום';
  if (n === 1) return 'מחר';
  if (n > 1) return `עוד ${n} ימים`;
  if (n === -1) return 'המועד עבר אתמול';
  return `המועד עבר לפני ${-n} ימים`;
}
