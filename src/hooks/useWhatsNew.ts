import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { CHANGELOG } from '../constants/changelog';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useWhatsNew() {
  const [lastSeen, setLastSeen] = useLocalStorage<string>('whatsNewLastSeen', '');
  const latestDate = CHANGELOG[0]?.date ?? '';

  // Show if the latest entry hasn't been seen yet today
  const [show, setShow] = useState(() => CHANGELOG.length > 0 && lastSeen !== latestDate);

  // Midnight check: if the app is open when the date rolls over, trigger the popup
  useEffect(() => {
    const id = setInterval(() => {
      if (CHANGELOG.length > 0 && lastSeen !== CHANGELOG[0].date) {
        setShow(true);
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [lastSeen]);

  const dismiss = () => {
    setLastSeen(latestDate);
    setShow(false);
  };

  return { show, dismiss };
}
