import { useState, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTrades } from '../context/TradeContext';
import { exportToJSON, downloadJSON, validateImportData, readFileAsJSON } from '../utils/data-io';
import { getStorageUsage } from '../utils/storage';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { Plus, X, Download, Upload, Trash2, HardDrive, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

function ListManager({ title, items, onAdd, onRemove }: {
  title: string;
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (item: string) => void;
}) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const trimmed = input.trim();
    if (trimmed && !items.includes(trimmed)) {
      onAdd(trimmed);
      setInput('');
    }
  };

  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-300 mb-3">{title}</h3>
      <div className="flex gap-2 mb-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder={`Add ${title.toLowerCase().replace(/s$/, '')}...`}
          className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button size="sm" onClick={handleAdd} disabled={!input.trim()}>
          <Plus size={14} />
        </Button>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {items.map(item => (
          <div key={item} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-700/50 group">
            <span className="text-sm text-slate-300">{item}</span>
            <button
              onClick={() => onRemove(item)}
              className="p-0.5 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const settings = useSettings();
  const { trades, importTrades, clearAllTrades } = useTrades();
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storage = getStorageUsage();

  const handleExport = () => {
    const json = exportToJSON(trades);
    downloadJSON(json, `trading-journal-${new Date().toISOString().split('T')[0]}.json`);
    toast.success(`Exported ${trades.length} trades`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await readFileAsJSON(file);
      const result = validateImportData(data);
      if (result.valid) {
        importTrades(result.trades);
        toast.success(`Imported ${result.trades.length} trades`);
      } else {
        toast.error(result.error || 'Invalid import file');
      }
    } catch (err) {
      toast.error('Failed to read import file');
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearAll = () => {
    clearAllTrades();
    setClearConfirmOpen(false);
    toast.success('All trades cleared');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Default Settings */}
      <Card>
        <h3 className="text-sm font-medium text-slate-300 mb-3">Defaults</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Default Contracts"
            type="number"
            min={1}
            value={settings.defaultContracts}
            onChange={e => settings.updateDefaultContracts(parseInt(e.target.value) || 1)}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">Default Instrument</label>
            <select
              value={settings.defaultInstrument}
              onChange={e => settings.updateDefaultInstrument(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {settings.instruments.map(i => (
                <option key={i.symbol} value={i.symbol}>{i.symbol} — {i.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Confluences, Setups & Grades */}
      <div className="grid grid-cols-3 gap-4">
        <ListManager
          title="Confluences"
          items={settings.confluences}
          onAdd={settings.addConfluence}
          onRemove={settings.removeConfluence}
        />
        <ListManager
          title="Setup Types"
          items={settings.setupTypes}
          onAdd={settings.addSetupType}
          onRemove={settings.removeSetupType}
        />
        <ListManager
          title="Grades"
          items={settings.grades}
          onAdd={settings.addGrade}
          onRemove={settings.removeGrade}
        />
      </div>

      {/* Instruments */}
      <Card>
        <h3 className="text-sm font-medium text-slate-300 mb-3">Instruments</h3>
        <div className="space-y-2">
          {settings.instruments.map(inst => (
            <div key={inst.symbol} className="flex items-center justify-between py-2 px-3 bg-slate-700/30 rounded-lg group">
              <div className="flex items-center gap-4">
                <span className="font-mono font-medium text-slate-200 w-12">{inst.symbol}</span>
                <span className="text-sm text-slate-400">{inst.name}</span>
                <span className="text-xs text-slate-500">
                  Tick: {inst.tickSize} = ${inst.tickValue} | Point = ${inst.pointValue}
                </span>
              </div>
              <button
                onClick={() => settings.removeInstrument(inst.symbol)}
                className="p-0.5 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Data Management */}
      <Card>
        <h3 className="text-sm font-medium text-slate-300 mb-3">Data Management</h3>
        <div className="flex gap-3 mb-4">
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} /> Export JSON ({trades.length} trades)
          </Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Import JSON
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <Button variant="danger" onClick={() => setClearConfirmOpen(true)} disabled={trades.length === 0}>
            <Trash2 size={16} /> Clear All Data
          </Button>
        </div>

        {/* Storage Usage */}
        <div className="p-3 bg-slate-700/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-400">Storage Usage</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${storage.percentage > 80 ? 'bg-rose-400' : storage.percentage > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${Math.min(storage.percentage, 100)}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {storage.usedFormatted} / 5 MB
            </span>
          </div>
          {storage.percentage > 70 && (
            <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
              <AlertTriangle size={12} />
              Storage usage is high. Consider exporting and removing old screenshot data.
            </p>
          )}
        </div>
      </Card>

      {/* Clear Confirm Modal */}
      <Modal open={clearConfirmOpen} onOpenChange={setClearConfirmOpen} title="Clear All Data">
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            This will permanently delete all {trades.length} trades. This action cannot be undone.
          </p>
          <p className="text-sm text-amber-400">
            Consider exporting your data first as a backup.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setClearConfirmOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleClearAll}>Delete All Trades</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
