import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrades } from '../context/TradeContext';
import TradeDetail from '../components/trade/TradeDetail';
import TradeForm from '../components/trade/TradeForm';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import type { TradeFormData } from '../types/trade';
import { Pencil, Trash2, ArrowLeft, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TradeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { trades, updateTrade, deleteTrade } = useTrades();
  const [editing, setEditing] = useState(false);

  const trade = trades.find(t => t.id === id);

  if (!trade) {
    return (
      <EmptyState
        icon={<FileText size={48} />}
        title="Trade not found"
        description="This trade may have been deleted."
        action={<Button variant="secondary" onClick={() => navigate('/trades')}>Back to Trade Log</Button>}
      />
    );
  }

  const handleUpdate = (data: TradeFormData) => {
    updateTrade(trade.id, {
      ...data,
      entry: Number(data.entry),
      stopLoss: Number(data.stopLoss),
      takeProfit: Number(data.takeProfit),
      exitPrice: Number(data.exitPrice),
      pointsPL: data.pointsPL ?? 0,
      dollarPL: data.dollarPL ?? 0,
      riskReward: data.riskReward ?? 0,
    });
    setEditing(false);
    toast.success('Trade updated');
  };

  const handleDelete = () => {
    if (!confirm('Delete this trade?')) return;
    deleteTrade(trade.id);
    toast.success('Trade deleted');
    navigate('/trades');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/trades')}>
          <ArrowLeft size={16} /> Back
        </Button>
        <div className="flex-1" />
        {!editing && (
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil size={14} /> Edit
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 size={14} /> Delete
            </Button>
          </>
        )}
        {editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </div>

      {editing ? (
        <TradeForm
          initialData={{
            date: trade.date,
            time: trade.time,
            instrument: trade.instrument,
            direction: trade.direction,
            entry: trade.entry,
            stopLoss: trade.stopLoss,
            takeProfit: trade.takeProfit,
            exitPrice: trade.exitPrice,
            contracts: trade.contracts,
            result: trade.result,
            setupType: trade.setupType,
            confluences: trade.confluences,
            emotionBefore: trade.emotionBefore,
            emotionAfter: trade.emotionAfter,
            grade: trade.grade,
            preTradeNotes: trade.preTradeNotes,
            postTradeNotes: trade.postTradeNotes,
            setupScreenshot: trade.setupScreenshot,
            resultScreenshot: trade.resultScreenshot,
            tags: trade.tags,
          }}
          onSubmit={handleUpdate}
          submitLabel="Update Trade"
        />
      ) : (
        <TradeDetail trade={trade} />
      )}
    </div>
  );
}
