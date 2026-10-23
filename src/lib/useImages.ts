import { useEffect, useState } from 'react';
import { loadImageUrls } from './images';
import { useStore } from './store';

/** טוען כתובות לתמונות הפנים, ומרענן כשהספרייה משתנה */
export function useFaceImages() {
  const faces = useStore((s) => s.faces);
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    let alive = true;
    loadImageUrls(faces.map((f) => f.id)).then((m) => alive && setUrls(new Map(m)));
    return () => {
      alive = false;
    };
  }, [faces]);
  return urls;
}
