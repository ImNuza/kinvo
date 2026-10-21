import { useId, type ReactNode } from 'react';
import { Icon } from './Icon.tsx';

export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
};

/** Square check box with a label (07 "Meaning"). */
export function Checkbox({ checked, onChange, children, disabled }: CheckboxProps) {
  const id = useId();
  return (
    <label className="k-check" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="k-check__box" aria-hidden="true">
        {checked && <Icon name="check" size={14} />}
      </span>
      <span className="k-check__label">{children}</span>
    </label>
  );
}
