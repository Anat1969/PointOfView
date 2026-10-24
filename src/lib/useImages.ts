import { useMemo } from 'react';
import { starterUrl } from './starter';
import { useStore } from './store';
import { publicUrl } from './supa';
import type { Face } from './types';

export const faceUrl = (f: Face) => (f.image_path ? publicUrl(f.image_path) : f.starter ? starterUrl(`starter-${f.starter}`) : undefined);

/** כתובות לתמונות הפנים לפי מזהה */
export function useFaceImages() {
  const faces = useStore((s) => s.faces);
  return useMemo(() => {
    const m = new Map<string, string>();
    faces.forEach((f) => {
      const u = faceUrl(f);
      if (u) m.set(f.id, u);
    });
    return m;
  }, [faces]);
}
