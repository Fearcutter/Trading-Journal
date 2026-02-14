import { ReactNode } from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';

interface TooltipProps {
  children: ReactNode;
  content: string;
}

export default function Tooltip({ children, content }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={300}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            className="bg-slate-700 text-slate-200 text-xs px-2 py-1 rounded shadow-lg z-50"
            sideOffset={4}
          >
            {content}
            <RadixTooltip.Arrow className="fill-slate-700" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
