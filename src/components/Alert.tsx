import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
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
};

/** iOS-style alert (03a). Renders inside the phone frame. */
export function Alert({ open, title, message, actions, onDismiss }: AlertProps) {
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
        <div className="k-alert__text">
          <h2 id={titleId} className="k-alert__title">
            {title}
          </h2>
          <p id={messageId} className="k-alert__message">
            {message}
          </p>
        </div>
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            className={`k-alert__action k-alert__action--${a.tone ?? 'default'}`}
            onClick={a.onClick}
            data-autofocus={a.tone === 'bold' ? true : undefined}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>,
    overlayRoot(),
  );
}
