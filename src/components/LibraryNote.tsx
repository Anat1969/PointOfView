import { selectEditing, useStore } from '../lib/store';

/** מצב הספרייה המשותפת: טעינה, ללא רשת, או צפייה בלבד */
export function LibraryNote() {
  const sync = useStore((s) => s.sync);
  const editing = useStore(selectEditing);
  if (sync === 'loading') return <p className="lib-note">טוען את הספרייה המשותפת...</p>;
  if (sync === 'offline')
    return (
      <p className="lib-note warn" role="status">
        אין חיבור לספרייה המשותפת. מוצג העותק האחרון שנשמר במכשיר, והעריכה כבויה עד שהחיבור יחזור.
      </p>
    );
  if (!editing) return <p className="lib-note">ספרייה משותפת לכל המכשירים.</p>;
  return <p className="lib-note edit">מצב עריכה. כל שינוי נשמר בספרייה המשותפת ומופיע בכל המכשירים.</p>;
}
