import { useState } from 'react';
import { ClipboardPaste } from 'lucide-react';
import PasteTradeModal from '../trade/PasteTradeModal';

interface TopBarProps {
  title: string;
  sessionId?: string;
}

export default function TopBar({ title, sessionId }: TopBarProps) {
  const [pasteModalOpen, setPasteModalOpen] = useState(false);

  return (
    <>
      <header className="h-14 border-b border-slate-700 flex items-center justify-between px-6">
        <h2 className="text-lg font-semibold text-slate-50">{title}</h2>
        <button
          onClick={() => setPasteModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors"
        >
          <ClipboardPaste size={16} />
          Paste Trade
        </button>
      </header>
      <PasteTradeModal open={pasteModalOpen} onOpenChange={setPasteModalOpen} sessionId={sessionId} />
    </>
  );
}
