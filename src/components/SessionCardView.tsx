import { motion } from 'framer-motion';
import type { SessionCard } from '../lib/types';
import { CardFace } from './CardFace';

/** קלף שמתהפך בכניסה: גב הקלף נראה קודם, ואז הפנים */
export function FlipCard({ card, url, index }: { card: SessionCard; url?: string; index: number }) {
  return (
    <div className="flip-wrap">
      <motion.div
        className="flip"
        initial={{ rotateY: 180, z: 120, y: -40 }}
        animate={{ rotateY: 0, z: 0, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.05 }}
      >
        <div className="flip-front">
          <CardFace card={card} url={url} />
          {card.note && <span className="note-flag">הערה</span>}
        </div>
        <div className={`flip-back back-${card.kind}`}>
          <span className="mono">{String(index + 1).padStart(2, '0')}</span>
        </div>
      </motion.div>
    </div>
  );
}
