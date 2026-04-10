import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { CHANGELOG } from '../constants/changelog';

export function useWhatsNew() {
  const [lastSeen, setLastSeen] = useLocalStorage<string>('whatsNewLastSeen', '');
  const latestDate = CHANGELOG[0]?.date ?? '';

  // All entries newer than the last-seen date
  const unseen = CHANGELOG.filter(e => e.date > lastSeen);

  const [show, setShow] = useState(() => unseen.length > 0);

  // Midnight check: if the app is open when new entries become relevant, trigger popup
  useEffect(() => {
    const id = setInterval(() => {
      if (CHANGELOG.some(e => e.date > lastSeen)) setShow(true);
    }, 60_000);
    return () => clearInterval(id);
  }, [lastSeen]);

  const dismiss = () => {
    setLastSeen(latestDate);
    setShow(false);
  };

  return { show, dismiss, unseen };
}
