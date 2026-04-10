import Modal from './ui/Modal';
import Button from './ui/Button';
import type { ChangelogEntry } from '../constants/changelog';
import { Sparkles } from 'lucide-react';

interface WhatsNewModalProps {
  open: boolean;
  onDismiss: () => void;
  unseen: ChangelogEntry[];
}

export default function WhatsNewModal({ open, onDismiss, unseen }: WhatsNewModalProps) {
  if (unseen.length === 0) return null;

  const title = unseen.length === 1
    ? `What's New — ${unseen[0].title}`
    : `What's New — ${unseen.length} Updates`;

  return (
    <Modal open={open} onOpenChange={v => { if (!v) onDismiss(); }} title={title} wide>
      <div className="space-y-6">
        {unseen.map((entry, ei) => (
          <div key={ei}>
            {unseen.length > 1 && (
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{entry.title}</p>
            )}
            <div className="space-y-4">
              {entry.changes.map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-0.5 shrink-0 text-blue-400">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                    <p className="text-sm text-slate-400 mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={onDismiss}>Got it</Button>
      </div>
    </Modal>
  );
}
