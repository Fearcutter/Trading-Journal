import { Eye, EyeOff } from 'lucide-react';

interface CoachShareToggleProps {
  hidden: boolean;
  onChange: (hidden: boolean) => void;
}

/** "Shared with coach" / "Hidden from coach" switch for a session. Works inside a card link. */
export default function CoachShareToggle({ hidden, onChange }: CoachShareToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!hidden}
      title={hidden ? 'Your coach cannot see this session or its trades. Click to share.' : 'Your coach can see this session. Click to hide it from them.'}
      onClick={e => { e.preventDefault(); e.stopPropagation(); onChange(!hidden); }}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
        hidden
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
          : 'border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500'
      }`}
    >
      {hidden ? <EyeOff size={12} /> : <Eye size={12} />}
      {hidden ? 'Hidden from coach' : 'Shared with coach'}
    </button>
  );
}
