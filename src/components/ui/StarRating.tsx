import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}

export default function StarRating({ value, onChange, label }: StarRatingProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star === value ? 0 : star)}
            className="p-0.5 transition-colors"
          >
            <Star
              size={20}
              className={star <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
