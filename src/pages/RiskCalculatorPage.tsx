import { useState } from 'react';
import { Calculator } from 'lucide-react';
import PositionSizeCalculator from '../components/risk/PositionSizeCalculator';
import RMultipleTable from '../components/risk/RMultipleTable';

export default function RiskCalculatorPage() {
  const [stopDistance, setStopDistance] = useState(10);
  const [pointValue, setPointValue] = useState(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-50 flex items-center gap-2">
          <Calculator size={24} />
          Risk Calculator
        </h1>
        <p className="text-slate-400 mt-1">Calculate position sizes and R-multiples for your trades.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <PositionSizeCalculator
          onStopDistanceChange={setStopDistance}
          onPointValueChange={setPointValue}
        />
        <RMultipleTable stopDistance={stopDistance} pointValue={pointValue} />
      </div>
    </div>
  );
}
