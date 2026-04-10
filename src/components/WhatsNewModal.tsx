import Modal from './ui/Modal';
import Button from './ui/Button';
import { CHANGELOG } from '../constants/changelog';
import { Sparkles } from 'lucide-react';

interface WhatsNewModalProps {
  open: boolean;
  onDismiss: () => void;
}

export default function WhatsNewModal({ open, onDismiss }: WhatsNewModalProps) {
  const entry = CHANGELOG[0];
  if (!entry) return null;

  return (
    <Modal open={open} onOpenChange={v => { if (!v) onDismiss(); }} title={`What's New — ${entry.title}`} wide>
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
      <div className="mt-6 flex justify-end">
        <Button onClick={onDismiss}>Got it</Button>
      </div>
    </Modal>
  );
}
