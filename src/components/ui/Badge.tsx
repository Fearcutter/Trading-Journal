import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'win' | 'loss' | 'breakeven' | 'long' | 'short';
  className?: string;
}

const variantStyles = {
  default: 'bg-slate-700 text-slate-300',
  win: 'bg-emerald-400/15 text-emerald-400',
  loss: 'bg-rose-400/15 text-rose-400',
  breakeven: 'bg-amber-400/15 text-amber-400',
  long: 'bg-blue-400/15 text-blue-400',
  short: 'bg-purple-400/15 text-purple-400',
};

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
