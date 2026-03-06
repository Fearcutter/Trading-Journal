import { useState, useMemo } from 'react';
import { usePlaybook } from '../context/PlaybookContext';
import { useTrades } from '../context/TradeContext';
import PlaybookCard from '../components/playbook/PlaybookCard';
import PlaybookEditor from '../components/playbook/PlaybookEditor';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import type { PlaybookEntry } from '../types/playbook';
import { BookMarked, Plus, Search } from 'lucide-react';

export default function PlaybookPage() {
  const { entries, addEntry, updateEntry, deleteEntry } = usePlaybook();
  const { trades } = useTrades();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PlaybookEntry | undefined>();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      e => e.name.toLowerCase().includes(q) || e.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [entries, search]);

  const handleCreate = () => {
    setEditingEntry(undefined);
    setEditorOpen(true);
  };

  const handleEdit = (entry: PlaybookEntry) => {
    setEditingEntry(entry);
    setEditorOpen(true);
  };

  const handleSubmit = (data: Omit<PlaybookEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingEntry) {
      updateEntry(editingEntry.id, data);
    } else {
      addEntry(data);
    }
    setEditorOpen(false);
    setEditingEntry(undefined);
  };

  const handleDelete = () => {
    if (editingEntry) {
      deleteEntry(editingEntry.id);
      setEditorOpen(false);
      setEditingEntry(undefined);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-50 flex items-center gap-2">
          <BookMarked size={22} /> Strategy Playbook
        </h1>
        <Button onClick={handleCreate}>
          <Plus size={16} /> Add Strategy
        </Button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search strategies by name or tag..."
          className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          {entries.length === 0 ? 'No strategies yet. Add your first strategy to get started.' : 'No strategies match your search.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(entry => (
            <PlaybookCard
              key={entry.id}
              entry={entry}
              trades={trades}
              onClick={() => handleEdit(entry)}
            />
          ))}
        </div>
      )}

      <Modal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        title={editingEntry ? 'Edit Strategy' : 'New Strategy'}
        wide
      >
        <PlaybookEditor
          key={editingEntry?.id ?? 'new'}
          initialData={editingEntry}
          onSubmit={handleSubmit}
          onCancel={() => setEditorOpen(false)}
        />
        {editingEntry && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <Button variant="danger" size="sm" onClick={handleDelete}>
              Delete Strategy
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
