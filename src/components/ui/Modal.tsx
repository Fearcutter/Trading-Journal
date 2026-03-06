import { type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}

export default function Modal({ open, onOpenChange, title, children, wide }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content
          aria-describedby={undefined}
          className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-[85vh] overflow-y-auto ${wide ? 'w-[640px]' : 'w-[480px]'}`}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <Dialog.Title className="text-lg font-semibold text-slate-50">
              {title}
            </Dialog.Title>
            <Dialog.Close className="p-1 rounded-lg text-slate-400 hover:text-slate-50 hover:bg-slate-700 transition-colors">
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className="p-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
