import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useView } from '../context/ViewContext';

export interface TradeComment {
  id: string;
  trade_id: string;
  author_id: string;
  body: string;
  read_by_owner: boolean;
  created_at: string;
  updated_at: string;
}

export function useTradeComments(tradeId: string) {
  const { user } = useAuth();
  const { mode, journalOwnerId } = useView();
  const [comments, setComments] = useState<TradeComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('trade_comments')
      .select('*')
      .eq('trade_id', tradeId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) toast.error(`Failed to load comments: ${error.message}`);
        setComments((data as TradeComment[]) ?? []);
        setLoading(false);
        // Owner opening the trade marks coach feedback as read
        if (mode === 'owner' && data?.some(c => !c.read_by_owner)) {
          // Builders are lazy: .then() is what actually sends the request
          supabase.rpc('mark_trade_comments_read', { p_trade: tradeId }).then(({ error: markError }) => {
            if (markError) console.error('[useTradeComments] Failed to mark read:', markError);
          });
        }
      });
    return () => { cancelled = true; };
  }, [tradeId, mode]);

  const add = useCallback(async (body: string) => {
    if (!user || !body.trim()) return false;
    const { data, error } = await supabase
      .from('trade_comments')
      .insert({ trade_id: tradeId, owner_id: journalOwnerId, author_id: user.id, body: body.trim() })
      .select()
      .single();
    if (error) { toast.error(`Failed to save comment: ${error.message}`); return false; }
    setComments(prev => [...prev, data as TradeComment]);
    return true;
  }, [user, tradeId, journalOwnerId]);

  const edit = useCallback(async (id: string, body: string) => {
    if (!body.trim()) return false;
    const updated_at = new Date().toISOString();
    const { error } = await supabase.from('trade_comments').update({ body: body.trim(), updated_at }).eq('id', id);
    if (error) { toast.error(`Failed to update comment: ${error.message}`); return false; }
    setComments(prev => prev.map(c => (c.id === id ? { ...c, body: body.trim(), updated_at } : c)));
    return true;
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('trade_comments').delete().eq('id', id);
    if (error) { toast.error(`Failed to delete comment: ${error.message}`); return; }
    setComments(prev => prev.filter(c => c.id !== id));
  }, []);

  return { comments, loading, add, edit, remove };
}
