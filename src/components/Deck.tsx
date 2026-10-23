import { motion } from 'framer-motion';

/** חפיסה בעומק: שכבות קלפים מוזזות על ציר Z */
export function Deck({
  kind,
  label,
  remaining,
  total,
  onDraw,
  disabledText,
}: {
  kind: 'face' | 'reflection';
  label: string;
  remaining: number;
  total: number;
  onDraw: () => void;
  disabledText?: string;
}) {
  const layers = Math.min(7, Math.max(1, Math.ceil(remaining / 8)));
  const empty = remaining === 0;
  return (
    <div className="deck-wrap">
      <motion.button
        className={`deck deck-${kind} ${empty ? 'empty' : ''}`}
        onClick={onDraw}
        disabled={empty}
        whileHover={empty ? undefined : { rotateX: 8, rotateZ: -2, y: -6 }}
        whileTap={empty ? undefined : { scale: 0.96, rotateX: 18 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        aria-label={`${label}, נותרו ${remaining}`}
      >
        {Array.from({ length: layers }).map((_, i) => (
          <span key={i} className="deck-layer" style={{ transform: `translateZ(${-i * 4}px) translateY(${i * 2.5}px)` }} />
        ))}
        <span className="deck-top">
          <span className="label">{kind === 'face' ? 'פנים' : 'השתקפות'}</span>
          <span className="deck-title">{label}</span>
          <span className="mono">
            {remaining} / {total}
          </span>
        </span>
      </motion.button>
      {empty && disabledText && <p className="deck-note">{disabledText}</p>}
    </div>
  );
}
