import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useView } from '../context/ViewContext';

/** Trade ids with coach comments the owner hasn't opened yet. Always empty for a coach. */
export function useUnreadCommentTradeIds(): Set<string> {
  const { mode, journalOwnerId } = useView();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (mode !== 'owner') return;
    let cancelled = false;
    supabase
      .from('trade_comments')
      .select('trade_id')
      .eq('owner_id', journalOwnerId)
      .eq('read_by_owner', false)
      .then(({ data }) => {
        if (!cancelled && data) setIds(new Set(data.map(r => r.trade_id as string)));
      });
    return () => { cancelled = true; };
  }, [mode, journalOwnerId]);

  return ids;
}
