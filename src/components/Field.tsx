import { useId, type ReactNode } from 'react';

export type FieldProps = {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  /** Textarea instead of a single-line input. */
  multiline?: boolean;
  /** Textarea rows. Default 2. */
  rows?: number;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
  /** Small helper or error text under the box. */
  hint?: ReactNode;
  invalid?: boolean;
  name?: string;
  autoComplete?: string;
  className?: string;
};

/** Figma "Field" (314:224): label above a bordered box. */
export function Field({
  label, value, onChange, multiline = false, rows = 2, placeholder, maxLength, autoFocus, hint, invalid, name, autoComplete, className,
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const common = {
    id,
    name,
    value,
    placeholder,
    maxLength,
    autoFocus,
    autoComplete,
    'aria-invalid': invalid || undefined,
    'aria-describedby': hintId,
    className: 'k-field__box',
  };
  return (
    <div className={['k-field', className ?? ''].filter(Boolean).join(' ')}>
      <label className="k-field__label" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea {...common} rows={rows} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...common} type="text" onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && (
        <p id={hintId} className={invalid ? 'k-field__hint k-field__hint--error' : 'k-field__hint'}>
          {hint}
        </p>
      )}
    </div>
  );
}
