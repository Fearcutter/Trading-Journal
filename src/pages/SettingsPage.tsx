import { useState, useRef, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTrades } from '../context/TradeContext';
import { exportToJSON, downloadJSON, validateImportData, readFileAsJSON } from '../utils/data-io';
import { useHabits } from '../context/HabitContext';
import { getStorageUsage } from '../utils/storage';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { Plus, X, Download, Upload, Trash2, HardDrive, AlertTriangle, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import type { CustomCategory } from '../types/settings';
import { DndContext, closestCenter, DragOverlay, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ item, onRemove }: { item: string; onRemove: (item: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-700/50 group">
      <div className="flex items-center gap-1.5">
        <button {...attributes} {...listeners} className="p-0.5 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing">
          <GripVertical size={14} />
        </button>
        <span className="text-sm text-slate-300">{item}</span>
      </div>
      <button
        onClick={() => onRemove(item)}
        className="p-0.5 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function ListManager({ title, items, onAdd, onRemove, onReorder }: {
  title: string;
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (item: string) => void;
  onReorder?: (items: string[]) => void;
}) {
  const [input, setInput] = useState('');
  const [activeItem, setActiveItem] = useState<string | null>(null);

  const handleAdd = () => {
    const trimmed = input.trim();
    if (trimmed && !items.includes(trimmed)) {
      onAdd(trimmed);
      setInput('');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveItem(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);
      onReorder?.(arrayMove(items, oldIndex, newIndex));
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
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {items.map(item => (
              <SortableItem key={item} item={item} onRemove={onRemove} />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeItem ? (
            <div className="flex items-center gap-1.5 py-1.5 px-2 rounded bg-slate-700 shadow-lg border border-slate-500">
              <GripVertical size={14} className="text-slate-400" />
              <span className="text-sm text-slate-300">{activeItem}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </Card>
  );
}

function SortableSectionCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card>
        <div className="flex gap-2">
          <button
            {...attributes}
            {...listeners}
            className="p-0.5 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing mt-0.5 shrink-0"
          >
            <GripVertical size={16} />
          </button>
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </Card>
    </div>
  );
}

function CategorySectionsManager({ settings }: { settings: ReturnType<typeof useSettings> }) {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  const sectionOrder = settings.categorySectionOrder;

  const getSectionLabel = (id: string) => {
    if (id === 'confluences') return 'Confluences (FOR)';
    if (id === 'confluencesAgainst') return 'Confluences (AGAINST)';
    const cat = (settings.customCategories || []).find(c => c.id === id);
    return cat?.name ?? id;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveSectionId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveSectionId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sectionOrder.indexOf(active.id as string);
      const newIndex = sectionOrder.indexOf(over.id as string);
      settings.updateSettings({ categorySectionOrder: arrayMove(sectionOrder, oldIndex, newIndex) });
    }
  };

  const handleCreateCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if ((settings.customCategories || []).some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Category already exists');
      return;
    }
    const category: CustomCategory = {
      id: uuidv4(),
      name: trimmed,
      options: [],
    };
    settings.addCustomCategory(category);
    setNewCategoryName('');
    toast.success(`Created category "${trimmed}"`);
  };

  const renderSectionContent = (id: string) => {
    if (id === 'confluences') {
      return (
        <ListManager
          title="Confluences (FOR)"
          items={settings.confluences}
          onAdd={settings.addConfluence}
          onRemove={settings.removeConfluence}
          onReorder={settings.reorderConfluences}
        />
      );
    }
    if (id === 'confluencesAgainst') {
      return (
        <ListManager
          title="Confluences (AGAINST)"
          items={settings.confluencesAgainst}
          onAdd={settings.addConfluenceAgainst}
          onRemove={settings.removeConfluenceAgainst}
          onReorder={settings.reorderConfluencesAgainst}
        />
      );
    }
    const cat = (settings.customCategories || []).find(c => c.id === id);
    if (!cat) return null;
    return (
      <>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-300">{cat.name}</h3>
          <button
            onClick={() => {
              settings.removeCustomCategory(cat.id);
              toast.success(`Deleted category "${cat.name}"`);
            }}
            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <ListManager
          title="Options"
          items={cat.options}
          onAdd={(option) => settings.addCustomCategoryOption(cat.id, option)}
          onRemove={(option) => settings.removeCustomCategoryOption(cat.id, option)}
          onReorder={(options) => settings.reorderCustomCategoryOptions(cat.id, options)}
        />
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          value={newCategoryName}
          onChange={e => setNewCategoryName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
          placeholder="New category name..."
          className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button size="sm" onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>
          <Plus size={14} /> Add Category
        </Button>
      </div>
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sectionOrder.map(id => (
              <SortableSectionCard key={id} id={id}>
                {renderSectionContent(id)}
              </SortableSectionCard>
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeSectionId ? (
            <div className="flex items-center gap-2 py-2 px-4 rounded-lg bg-slate-700 shadow-lg border border-slate-500">
              <GripVertical size={16} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-200">{getSectionLabel(activeSectionId)}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

export default function SettingsPage() {
  const settings = useSettings();
  const { trades, importTrades, clearAllTrades } = useTrades();
  const { definitions: habitDefs, checkIns: habitCheckIns, badges: habitBadges } = useHabits();
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [storage, setStorage] = useState<{ usedFormatted: string; totalFormatted: string; percentage: number } | null>(null);

  useEffect(() => {
    getStorageUsage().then(s => setStorage(s));
  }, []);

  const handleExport = () => {
    const json = exportToJSON(trades, { definitions: habitDefs, checkIns: habitCheckIns, badges: habitBadges });
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
    <div className="space-y-6 max-w-5xl">
      {/* Display Mode */}
      <Card>
        <h3 className="text-sm font-medium text-slate-300 mb-3">Display</h3>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-400">P&L Display Mode</label>
          <div className="inline-flex rounded-lg border border-slate-600 overflow-hidden">
            <button
              onClick={() => settings.updateSettings({ plDisplayMode: 'dollar' })}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                settings.plDisplayMode === 'dollar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Dollar ($)
            </button>
            <button
              onClick={() => settings.updateSettings({ plDisplayMode: 'points' })}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                settings.plDisplayMode === 'points'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Points (pts)
            </button>
            <button
              onClick={() => settings.updateSettings({ plDisplayMode: 'r' })}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                settings.plDisplayMode === 'r'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              R-Multiple (R)
            </button>
          </div>
        </div>
      </Card>

      {/* Default Settings */}
      <Card>
        <h3 className="text-sm font-medium text-slate-300 mb-3">Defaults</h3>
        <div className="grid grid-cols-3 gap-4">
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
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">Trading Timezone</label>
            <select
              value={settings.tradingTimezone}
              onChange={e => settings.updateSettings({ tradingTimezone: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="America/New_York">Eastern (ET)</option>
              <option value="America/Chicago">Central (CT)</option>
              <option value="America/Denver">Mountain (MT)</option>
              <option value="America/Los_Angeles">Pacific (PT)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Setup Types & Grades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ListManager
          title="Setup Types"
          items={settings.setupTypes}
          onAdd={settings.addSetupType}
          onRemove={settings.removeSetupType}
          onReorder={settings.reorderSetupTypes}
        />
        <ListManager
          title="Grades"
          items={settings.grades}
          onAdd={settings.addGrade}
          onRemove={settings.removeGrade}
          onReorder={settings.reorderGrades}
        />
      </div>

      {/* Categories & Confluences — reorderable sections */}
      <CategorySectionsManager settings={settings} />

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
          {storage ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${storage.percentage > 80 ? 'bg-rose-400' : storage.percentage > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    style={{ width: `${Math.min(storage.percentage, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {storage.usedFormatted} / {storage.totalFormatted}
                </span>
              </div>
              {storage.percentage > 70 && (
                <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Storage usage is high. Consider exporting and removing old screenshot data.
                </p>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-500">Calculating...</span>
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
