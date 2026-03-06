import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import TradeForm from '../components/trade/TradeForm';
import { useTrades } from '../context/TradeContext';
import type { TradeFormData } from '../types/trade';
import type { ParsedTradeData } from '../utils/tradingview-parser';

export default function TradeEntryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addTrade } = useTrades();
  const parsedTrade = (location.state as { parsedTrade?: ParsedTradeData } | null)?.parsedTrade;

  const initialData: Partial<TradeFormData> | undefined = parsedTrade
    ? {
        direction: parsedTrade.direction,
        entry: parsedTrade.entry,
        stopLoss: parsedTrade.stopLoss,
        takeProfit: parsedTrade.takeProfit,
        exitPrice: parsedTrade.takeProfit,
        result: parsedTrade.result,
      }
    : undefined;

  const handleSubmit = (data: TradeFormData) => {
    addTrade(data);
    toast.success('Trade saved!');
    navigate('/trades');
  };

  return (
    <div>
      <TradeForm initialData={initialData} onSubmit={handleSubmit} />
    </div>
  );
}
