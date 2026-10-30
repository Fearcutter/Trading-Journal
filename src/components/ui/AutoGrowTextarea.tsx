import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';

/** A textarea that grows with its content, so everything written stays in view. */
export default function AutoGrowTextarea({ value, rows = 10, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto'; // shrink first so deleting text shrinks the box (never below `rows`)
    el.style.height = `${el.scrollHeight + 2}px`; // + top/bottom border
  }, [value]);

  return <textarea ref={ref} value={value} rows={rows} {...props} />;
}
