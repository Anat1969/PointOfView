import type { SessionCard } from '../lib/types';
import { isBlank } from '../lib/deck';
import { useStore } from '../lib/store';

/** פני הקלף: תמונה לקלף פנים, טיפוגרפיה לקלף השתקפות */
export function CardFace({ card, url, big = false }: { card: SessionCard; url?: string; big?: boolean }) {
  const face = useStore((s) => (card.kind === 'face' ? s.faces.find((f) => f.id === card.refId) : undefined));
  if (card.kind === 'face') {
    return (
      <div className={`card-face face ${big ? 'big' : ''}`}>
        {url ? <img src={url} alt={face?.name ?? 'פנים'} draggable={false} /> : <div className="missing">התמונה נמחקה מהספרייה</div>}
        <span className="card-tag">פנים</span>
      </div>
    );
  }
  if (card.kind === 'coach') {
    return (
      <div className={`card-face coach ${big ? 'big' : ''}`}>
        {url ? <img src={url} alt="" draggable={false} /> : <div className="missing">התמונה נמחקה מהספרייה</div>}
        <span className="coach-word">{card.text}</span>
      </div>
    );
  }
  const blank = isBlank(card);
  return (
    <div className={`card-face reflection ${blank ? 'blank' : ''} ${big ? 'big' : ''}`}>
      <span className="card-tag">השתקפות</span>
      <span className="word">{blank ? card.note.split('\n')[0] || 'קלף ריק' : card.text}</span>
      {blank && <span className="blank-hint">המילה נכתבת בהערה</span>}
    </div>
  );
}
