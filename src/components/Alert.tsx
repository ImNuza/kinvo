import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button, type ButtonVariant } from './Button.tsx';
import { Icon, type IconName } from './Icon.tsx';
import { overlayRoot, useModal } from './useModal.ts';

export type AlertAction = {
  label: string;
  onClick: () => void;
  /** "bold" = the preferred action, "destructive" = red. */
  tone?: 'default' | 'bold' | 'destructive';
};

export type AlertProps = {
  open: boolean;
  title: string;
  message: string;
  /** Stacked top to bottom, as in 03a. */
  actions: AlertAction[];
  /** Escape key. Usually the same as the "keep going" action. */
  onDismiss?: () => void;
  /** Icon in a red ring above the title, e.g. "warn" on 03a. */
  icon?: IconName;
};

const VARIANT: Record<NonNullable<AlertAction['tone']>, ButtonVariant> = {
  bold: 'primary',
  default: 'outline',
  destructive: 'destructive',
};

/** Alert dialog (03a): icon, title, message and full-width stacked buttons. Renders inside the phone frame. */
export function Alert({ open, title, message, actions, onDismiss, icon }: AlertProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const messageId = useId();
  useModal(open, ref, onDismiss);
  if (!open) return null;
  return createPortal(
    <div className="k-overlay k-overlay--center">
      <div className="k-scrim" aria-hidden="true" />
      <div
        className="k-alert"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        ref={ref}
        tabIndex={-1}
      >
        {icon && (
          <span className="k-alert__icon">
            <Icon name={icon} size={22} />
          </span>
        )}
        <div className="k-alert__text">
          <h2 id={titleId} className="k-alert__title">
            {title}
          </h2>
          <p id={messageId} className="k-alert__message">
            {message}
          </p>
        </div>
        <div className="k-alert__actions">
          {actions.map((a) => (
            <Button
              key={a.label}
              variant={VARIANT[a.tone ?? 'default']}
              size="md"
              block
              onClick={a.onClick}
              data-autofocus={a.tone === 'bold' ? true : undefined}
            >
              {a.label}
            </Button>
          ))}
        </div>
      </div>
    </div>,
    overlayRoot(),
  );
}
