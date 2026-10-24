import { useMemo } from 'react';
import { coachStarterUrl } from './coach';
import { starterUrl } from './starter';
import { useStore } from './store';
import { publicUrl } from './supa';
import type { CoachCard, Face } from './types';

export const faceUrl = (f: Face) => (f.image_path ? publicUrl(f.image_path) : f.starter ? starterUrl(`starter-${f.starter}`) : undefined);
export const coachUrl = (c: CoachCard) => (c.image_path ? publicUrl(c.image_path) : c.starter ? coachStarterUrl(c.starter) : undefined);

/** כתובות לתמונות הקלפים לפי מזהה: פנים וקלפי אימון */
export function useFaceImages() {
  const faces = useStore((s) => s.faces);
  const coach = useStore((s) => s.coachCards);
  return useMemo(() => {
    const m = new Map<string, string>();
    faces.forEach((f) => {
      const u = faceUrl(f);
      if (u) m.set(f.id, u);
    });
    coach.forEach((c) => {
      const u = coachUrl(c);
      if (u) m.set(c.id, u);
    });
    return m;
  }, [faces, coach]);
}
