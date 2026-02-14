import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import TradeForm from '../components/trade/TradeForm';
import { useTrades } from '../context/TradeContext';
import { useSettings } from '../context/SettingsContext';
import { calculatePointsPL, calculateDollarPL, calculateRiskReward } from '../utils/pnl-calculator';
import type { TradeFormData } from '../types/trade';
import type { ParsedTradeData } from '../utils/tradingview-parser';

export default function TradeEntryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addTrade, updateTrade } = useTrades();
  const settings = useSettings();
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
    const instrument = settings.getInstrument(data.instrument);
    const entry = Number(data.entry);
    const exitPrice = Number(data.exitPrice);
    const stopLoss = Number(data.stopLoss);
    const takeProfit = Number(data.takeProfit);

    const pointsPL = calculatePointsPL(entry, exitPrice, data.direction);
    const dollarPL = instrument ? calculateDollarPL(pointsPL, instrument, data.contracts) : 0;
    const rr = calculateRiskReward(entry, stopLoss, takeProfit, data.direction);

    const trade = addTrade(data);
    updateTrade(trade.id, { pointsPL, dollarPL, riskReward: rr });

    toast.success('Trade saved!');
    navigate('/trades');
  };

  return (
    <div>
      <TradeForm initialData={initialData} onSubmit={handleSubmit} />
    </div>
  );
}
