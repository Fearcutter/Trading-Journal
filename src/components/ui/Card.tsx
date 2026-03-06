import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export default function Card({ children, className = '', padding = true }: CardProps) {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl ${padding ? 'p-4' : ''} ${className}`}>
      {children}
    </div>
  );
}
