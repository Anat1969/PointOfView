import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';

export type RingItem = { key: string; url?: string; word?: string; caption?: string };

/** טבעת קלפים תלת־ממדית שמסתובבת לאט, וניתנת לגרירה */
export function Ring3D({ items }: { items: RingItem[] }) {
  const reduce = useReducedMotion();
  const angle = useMotionValue(0);
  const tiltX = useMotionValue(-8);
  const dragging = useRef(false);
  const count = items.length;
  const radius = Math.max(260, (count * 150) / (2 * Math.PI));
  const transform = useTransform([angle, tiltX], ([a, t]: number[]) => `translateZ(-${radius}px) rotateX(${t}deg) rotateY(${a}deg)`);

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (!dragging.current) angle.set(angle.get() + (now - last) * 0.006);
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [angle, reduce]);

  const step = 360 / count;
  const cards = useMemo(() => items, [items]);

  return (
    <div
      className="ring-stage"
      aria-hidden="true"
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        angle.set(angle.get() + e.movementX * 0.35);
        tiltX.set(Math.max(-24, Math.min(10, tiltX.get() - e.movementY * 0.15)));
      }}
      onPointerUp={() => {
        dragging.current = false;
        animate(tiltX, -8, { type: 'spring', stiffness: 60, damping: 12 });
      }}
    >
      <motion.div className="ring" style={{ transform }}>
        {cards.map((it, i) => (
          <div
            key={it.key}
            className={`ring-card ${it.url ? 'has-img' : it.word ? 'is-word' : 'is-ghost'}`}
            style={{ transform: `rotateY(${i * step}deg) translateZ(${radius}px)` }}
          >
            {it.url ? <img src={it.url} alt="" draggable={false} /> : it.word ? <span>{it.word}</span> : <i />}
            {it.caption && <b className="ring-caption">{it.caption}</b>}
          </div>
        ))}
      </motion.div>
      <div className="ring-floor" />
    </div>
  );
}
