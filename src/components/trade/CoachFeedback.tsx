import { useState } from 'react';
import { format } from 'date-fns';
import { MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useView } from '../../context/ViewContext';
import { useTradeComments, type TradeComment } from '../../hooks/useTradeComments';
import Button from '../ui/Button';

const textareaClass = 'w-full min-h-[80px] px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

function CommentItem({ comment, canEdit, onEdit, onDelete }: {
  comment: TradeComment;
  canEdit: boolean;
  onEdit: (id: string, body: string) => Promise<boolean>;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);

  return (
    <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500">
          Coach · {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
          {comment.updated_at !== comment.created_at && ' (edited)'}
        </span>
        {canEdit && !editing && (
          <div className="flex gap-1">
            <button onClick={() => setEditing(true)} className="p-1 text-slate-500 hover:text-blue-400"><Pencil size={13} /></button>
            <button onClick={() => onDelete(comment.id)} className="p-1 text-slate-500 hover:text-rose-400"><Trash2 size={13} /></button>
          </div>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea value={draft} onChange={e => setDraft(e.target.value)} className={textareaClass} />
          <div className="flex gap-2">
            <Button size="sm" onClick={async () => { if (await onEdit(comment.id, draft)) setEditing(false); }}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setDraft(comment.body); setEditing(false); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-200 whitespace-pre-wrap">{comment.body}</p>
      )}
    </div>
  );
}

export default function CoachFeedback({ tradeId }: { tradeId: string }) {
  const { user } = useAuth();
  const { mode } = useView();
  const { comments, loading, add, edit, remove } = useTradeComments(tradeId);
  const [draft, setDraft] = useState('');
  const isCoach = mode === 'coach';

  if (!isCoach && !loading && comments.length === 0) return null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
        <MessageSquare size={16} /> Coach Feedback
      </h3>
      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : (
        <>
          {comments.map(c => (
            <CommentItem key={c.id} comment={c} canEdit={isCoach && c.author_id === user?.id} onEdit={edit} onDelete={remove} />
          ))}
          {isCoach && (
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Leave feedback on this trade..."
                className={textareaClass}
              />
              <Button size="sm" disabled={!draft.trim()} onClick={async () => { if (await add(draft)) setDraft(''); }}>
                Add Comment
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
