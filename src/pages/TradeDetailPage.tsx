import { useState } from 'react';
import { useView } from '../context/ViewContext';
import { canOpenTrade } from '../constants/coachSections';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTrades } from '../context/TradeContext';
import { useBacktest } from '../context/BacktestContext';
import TradeDetail from '../components/trade/TradeDetail';
import CoachFeedback from '../components/trade/CoachFeedback';
import TradeForm from '../components/trade/TradeForm';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { potentialReasonLabel, type TradeFormData } from '../types/trade';
import { Pencil, Trash2, ArrowLeft, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TradeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { allTrades: trades, updateTrade, deleteTrade } = useTrades();
  const [searchParams] = useSearchParams();
  const { readOnly, mode, sharedSections } = useView();
  const [editing, setEditing] = useState(searchParams.has('edit') && !readOnly);

  const { getSession: getBacktestSession, loading: backtestLoading } = useBacktest();
  const trade = trades.find(t => t.id === id);
  const isBacktestTrade = !!(trade?.sessionId && getBacktestSession(trade.sessionId));

  if (mode === 'coach' && trade) {
    // Whether this is a backtest trade isn't known until the sessions load
    if (backtestLoading) return null;
    if (!canOpenTrade(isBacktestTrade, sharedSections)) {
      return <div className="py-24 text-center text-sm text-slate-400">This section isn't shared with you.</div>;
    }
  }

  if (!trade) {
    return (
      <EmptyState
        icon={<FileText size={48} />}
        title="Trade not found"
        description="This trade may have been deleted."
        action={<Button variant="secondary" onClick={() => navigate(-1)}>Go Back</Button>}
      />
    );
  }

  const handleUpdate = (data: TradeFormData) => {
    updateTrade(trade.id, {
      ...data,
      exitTime: data.exitTime || undefined,
      entry: Number(data.entry),
      stopLoss: Number(data.stopLoss),
      takeProfit: Number(data.takeProfit),
      exitPrice: Number(data.exitPrice),
      pointsPL: data.pointsPL ?? 0,
      dollarPL: data.dollarPL ?? 0,
      riskReward: data.riskReward ?? 0,
      ifvgSize: data.ifvgSize === '' ? undefined : data.ifvgSize,
      mae: data.mae === '' ? undefined : data.mae,
      mfe: data.mfe === '' ? undefined : data.mfe,
      drawback1R: data.drawback1R === '' ? undefined : data.drawback1R,
      drawback2R: data.drawback2R === '' ? undefined : data.drawback2R,
      returnedToBE: data.returnedToBE,
      overlap: data.overlap,
      accountIds: data.accountIds,
      potential: data.potential,
      potentialReason: data.potentialReason,
      additionalScreenshots: data.additionalScreenshots?.length ? data.additionalScreenshots : undefined,
    });
    toast.success('Trade updated');
    navigate(-1);
  };

  const handleDelete = () => {
    if (!confirm('Delete this trade?')) return;
    deleteTrade(trade.id);
    toast.success('Trade deleted');
    navigate(-1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </Button>
        <div className="flex-1" />
        {!editing && !readOnly && (
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
            exitTime: trade.exitTime ?? '',
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
            confluencesAgainst: trade.confluencesAgainst,
            emotionBefore: trade.emotionBefore,
            emotionAfter: trade.emotionAfter,
            grade: trade.grade,
            preTradeNotes: trade.preTradeNotes,
            postTradeNotes: trade.postTradeNotes,
            setupScreenshot: trade.setupScreenshot,
            resultScreenshot: trade.resultScreenshot,
            additionalScreenshots: trade.additionalScreenshots,
            tags: trade.tags,
            ifvgSize: trade.ifvgSize ?? '',
            mae: trade.mae ?? '',
            mfe: trade.mfe ?? '',
            drawback1R: trade.drawback1R ?? '',
            drawback2R: trade.drawback2R ?? '',
            returnedToBE: trade.returnedToBE,
            overlap: trade.overlap,
            sessionId: trade.sessionId,
            customFields: trade.customFields,
            accountIds: trade.accountIds,
            potential: trade.potential,
            potentialReason: trade.potentialReason && potentialReasonLabel(trade.potentialReason),
          }}
          onSubmit={handleUpdate}
          submitLabel="Update Trade"
          hideAccounts={isBacktestTrade}
          allowPotential={!isBacktestTrade}
        />
      ) : (
        <>
          <TradeDetail trade={trade} />
          <CoachFeedback tradeId={trade.id} />
        </>
      )}
    </div>
  );
}
