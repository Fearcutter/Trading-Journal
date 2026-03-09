interface TopBarProps {
  title: string;
  sessionId?: string;
}

export default function TopBar({ title }: TopBarProps) {
  return (
    <header className="h-14 border-b border-slate-700 flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-slate-50">{title}</h2>
    </header>
  );
}
