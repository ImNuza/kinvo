import { useId, useRef, type KeyboardEvent } from 'react';

export type ChoiceOption<T extends string> = { value: T; label: string };

export type ChoiceChipGroupProps<T extends string> = {
  label: string;
  options: ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
};

/** Figma "Choice Chip" (372:2016) as a radio group. Arrow keys move the choice. */
export function ChoiceChipGroup<T extends string>({ label, options, value, onChange, className }: ChoiceChipGroupProps<T>) {
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);

  function onKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  }

  return (
    <div className={['k-chips', className ?? ''].filter(Boolean).join(' ')}>
      <p id={labelId} className="k-field__label">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="k-chips__row">
        {options.map((o, i) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on || (selectedIndex === -1 && i === 0) ? 0 : -1}
              className={on ? 'k-chip k-chip--on' : 'k-chip'}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => onKey(e, i)}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
