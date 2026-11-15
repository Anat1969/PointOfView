import { Fragment } from 'react';

/** טקסט חוויתי: **ביטוי** מודגש ומרוקר, כדי שהתובנה החשובה תבלוט */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <mark key={i} className="hl">
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  );
}
