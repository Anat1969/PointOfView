# Faces: הנחיות לעבודה בריפו

## אישורים קבועים
- ענת אישרה מיזוג קבוע: אחרי בדיקה ירוקה, למזג כל PR ל-main בלי לשאול.
- לא לעצור לשאלות שאפשר להכריע לבד. להחליט ולרשום את ההנחה בשורה אחת ב-README.

## תיקונים של ענת
- ספריות לא נמסרות ריקות. תמיד ערכת פתיחה מקורית ומלאה, טעונה ומוכנה לשימוש.
- Supabase: פרויקט cultura-GH (ktqmwpbzcnzkhjskqisy). קידומת faces_ לטבלאות, דלי faces-media.

## נתונים
- ספריות ב-Supabase, קריאה ציבורית. כתיבה: faces_is_admin() = מייל ב-faces_admins, או מפתח בכותרת x-editor-key שה-sha256 שלו ב-faces_editor_keys.
- המפתח לא נשמר בריפו. קישור עריכה: https://faces-pointofview.vercel.app/?key=<מפתח>. מפתח חדש: להוסיף hash לטבלה.
- סשנים נשארים במכשיר (הערות אישיות).

## רכיבים קבועים
- סרגל עליון קבוע בכל הדפים: "Faces" מקשר לדף הבית, "העתקת קישור", "שיחת הפיתוח", "פרויקט המחקר", "התקנת האפליקציה" (מופיע רק כש-Chrome מציע התקנה).
- קישורים: שיחת הפיתוח https://claude.ai/code/session_019kTroUQMhUxN3z5tZbgygY · פרויקט המחקר https://claude.ai/chat/318dc51b-64aa-4109-ba88-fde716894cce (ב-src/components/TopBar.tsx).
- עברית ו-RTL, בלי אייקונים בממשק. IBM Plex Sans Hebrew לטקסט, IBM Plex Mono לתוויות.
- צבעים שנושאים משמעות: פנים בגוון אבן (--face), השתקפויות בכחול דיו (--refl). לא להחליף באפור.
- תמיד עומק, הנפשה ושכבות: טבעת תלת־ממדית בבית, קלפים שמתהפכים בשליפה, גלגל קלפים בתצוגת קבוצה.

## בדיקה לפני דחיפה
1. `npm run build`
2. `npm run preview` ברקע, ואז `npm run test:e2e`. הבדיקה לוחצת על כל כפתור, בודקת נייד בלי גלילה אופקית ובודקת שאין שגיאות התקנה.
3. להסתכל על צילומי המסך בתיקייה `screenshots`.

## מלכודות שנלמדו
- אחרי שינוי בקבצים ב-public צריך לבנות מחדש לפני preview, אחרת השרת מחזיר HTML במקום האייקון, ובדיקת ההתקנה נכשלת.
- דפדפן headless מחליף שם קובץ בעברית ב-"download", ולכן שמות קבצי הייצוא באנגלית.
- `.btn` מוגדר אחרי `.menu-toggle`, ולכן הסלקטור צריך להיות `.btn.menu-toggle`.
- הטיית תלת־ממד (translateZ) מרחיבה את הדף בנייד. `.main` מקבל `overflow-x: clip`.
- בדיקת התקנה (`Page.getInstallabilityErrors`) רצה רק בפרופיל רגיל (launchPersistentContext), כי בגלישה בסתר מתקבלת השגיאה in-incognito.
- Playwright: להשתמש ב-executablePath '/opt/pw-browsers/chromium'.
- ה-service worker מסתיר בקשות מ-page.route. בבדיקות עם מוק: serviceWorkers: 'block'. ההתקנה נבדקת בהקשר נפרד.
- storage-js עוטף Blob ב-FormData. מעלים ArrayBuffer עם contentType, כדי שהקובץ יישמר כתמונה נקייה.
- הסביבה לא מגיעה ל-supabase.co: בדיקות דרך מוק (tests/supa-mock.mjs), והרשאות RLS נבדקות ב-SQL עם set local role anon.
