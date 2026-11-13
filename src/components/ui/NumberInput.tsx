import { useState, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number | null;
  onChange: (value: number | null) => void;
  /** Put back when the box is left empty. Without one, an empty box means null. */
  fallback?: number;
  /** Smallest number kept; anything lower is raised to it when leaving the box. */
  minValue?: number;
  integer?: boolean;
};

/**
 * A number box that can be cleared while typing. The old pattern of turning
 * '' into 0 on every keystroke put the 0 straight back, so it couldn't be erased.
 */
export default function NumberInput({ value, onChange, fallback, minValue, integer, onBlur, ...rest }: Props) {
  const [text, setText] = useState(value == null ? '' : String(value));
  const [seen, setSeen] = useState(value);
  // Follow changes made from outside (a reset, a preset), but not our own edits
  if (value !== seen) {
    setSeen(value);
    if (text === '' ? value !== null : Number(text) !== value) setText(value == null ? '' : String(value));
  }

  const tidy = (n: number) => {
    let v = integer ? Math.round(n) : n;
    if (minValue !== undefined) v = Math.max(minValue, v);
    return v;
  };

  return (
    <input
      {...rest}
      type="number"
      value={text}
      onChange={e => {
        const raw = e.target.value;
        setText(raw);
        if (raw === '') return;
        const n = Number(raw);
        if (Number.isFinite(n) && (minValue === undefined || n >= minValue)) {
          const v = integer ? Math.round(n) : n;
          setSeen(v);
          onChange(v);
        }
      }}
      onBlur={e => {
        const n = Number(text);
        const next = text === '' || !Number.isFinite(n) ? (fallback ?? null) : tidy(n);
        setText(next == null ? '' : String(next));
        setSeen(next);
        if (next !== value) onChange(next);
        onBlur?.(e);
      }}
    />
  );
}
