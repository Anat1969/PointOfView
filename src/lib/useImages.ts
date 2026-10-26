import { useMemo } from 'react';
import { coachStarterUrl } from './coach';
import { starterUrl } from './starter';
import { useStore } from './store';
import { publicUrl, thumbUrl } from './supa';
import type { CoachCard, Face } from './types';

const img = (path: string, full: boolean) => (full ? publicUrl(path) : thumbUrl(path));
export const faceUrl = (f: Face, full = false) => (f.image_path ? img(f.image_path, full) : f.starter ? starterUrl(`starter-${f.starter}`) : undefined);
export const coachUrl = (c: CoachCard, full = false) => (c.image_path ? img(c.image_path, full) : c.starter ? coachStarterUrl(c.starter) : undefined);

/** כתובות לתמונות הקלפים לפי מזהה: פנים וקלפי אימון. full לתצוגת הקבוצה, אחרת תמונה מוקטנת */
export function useFaceImages(full = false) {
  const faces = useStore((s) => s.faces);
  const coach = useStore((s) => s.coachCards);
  return useMemo(() => {
    const m = new Map<string, string>();
    faces.forEach((f) => {
      const u = faceUrl(f, full);
      if (u) m.set(f.id, u);
    });
    coach.forEach((c) => {
      const u = coachUrl(c, full);
      if (u) m.set(c.id, u);
    });
    return m;
  }, [faces, coach, full]);
}
