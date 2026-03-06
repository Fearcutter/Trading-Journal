import { useState, useMemo, useEffect } from 'react';

interface Props {
  onStopDistanceChange: (value: number) => void;
  onPointValueChange: (value: number) => void;
}

export default function PositionSizeCalculator({ onStopDistanceChange, onPointValueChange }: Props) {
  const [accountBalance, setAccountBalance] = useState(50000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [stopDistance, setStopDistance] = useState(10);
  const [pointValue, setPointValue] = useState(20);

  useEffect(() => { onStopDistanceChange(stopDistance); }, [stopDistance, onStopDistanceChange]);
  useEffect(() => { onPointValueChange(pointValue); }, [pointValue, onPointValueChange]);

  const calculations = useMemo(() => {
    const dollarRisk = accountBalance * (riskPercent / 100);
    const riskPerContract = stopDistance * pointValue;
    const maxContracts = riskPerContract > 0 ? Math.floor(dollarRisk / riskPerContract) : 0;
    return { dollarRisk, riskPerContract, maxContracts };
  }, [accountBalance, riskPercent, stopDistance, pointValue]);

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-5">
      <h2 className="text-lg font-semibold text-slate-50 mb-4">Position Size Calculator</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Account Balance ($)</label>
          <input
            type="number"
            value={accountBalance}
            onChange={e => setAccountBalance(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Risk Per Trade (%)</label>
          <input
            type="number"
            value={riskPercent}
            onChange={e => setRiskPercent(Number(e.target.value))}
            step="0.25"
            min="0"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Stop Distance (points)</label>
          <input
            type="number"
            value={stopDistance}
            onChange={e => setStopDistance(Number(e.target.value))}
            min="0"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Point Value ($)</label>
          <input
            type="number"
            value={pointValue}
            onChange={e => setPointValue(Number(e.target.value))}
            min="0"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="mt-5 pt-4 border-t border-slate-700 space-y-3">
        <div className="flex justify-between">
          <span className="text-slate-400">Dollar Risk</span>
          <span className="text-slate-50 font-medium">${calculations.dollarRisk.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Risk Per Contract</span>
          <span className="text-slate-50 font-medium">${calculations.riskPerContract.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Max Contracts</span>
          <span className="text-lg text-blue-400 font-bold">{calculations.maxContracts}</span>
        </div>
      </div>
    </div>
  );
}
