import type { EarnedBadge, BadgeType } from '../../types/habit';
import { BADGE_DEFINITIONS } from '../../constants/habits';
import { format, parseISO } from 'date-fns';

interface BadgeShowcaseProps {
  earnedBadges: EarnedBadge[];
}

const ALL_BADGE_TYPES: BadgeType[] = [
  'streak-3', 'streak-7', 'streak-14', 'streak-30', 'streak-60', 'streak-100',
  'perfect-week', 'perfect-month',
];

export default function BadgeShowcase({ earnedBadges }: BadgeShowcaseProps) {
  const earnedSet = new Set(earnedBadges.map(b => b.type));

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Badges</h3>
      <div className="grid grid-cols-4 gap-3">
        {ALL_BADGE_TYPES.map(type => {
          const def = BADGE_DEFINITIONS[type];
          const earned = earnedBadges.find(b => b.type === type);
          const isEarned = earnedSet.has(type);

          return (
            <div
              key={type}
              className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                isEarned
                  ? 'bg-slate-800 border-amber-500/30'
                  : 'bg-slate-800/30 border-slate-700/50 opacity-40'
              }`}
              title={isEarned && earned ? `Earned ${format(parseISO(earned.earnedAt), 'MMM d, yyyy')}` : def.description}
            >
              <span className="text-2xl mb-1">{def.emoji}</span>
              <span className={`text-[10px] font-medium text-center ${isEarned ? 'text-slate-200' : 'text-slate-500'}`}>
                {def.name}
              </span>
              {isEarned && earned && (
                <span className="text-[9px] text-slate-500 mt-0.5">
                  {format(parseISO(earned.earnedAt), 'MMM d')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
