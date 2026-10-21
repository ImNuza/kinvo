import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { overlayRoot, useModal } from './useModal.ts';

export type SheetAction = { label: string; onClick: () => void; disabled?: boolean };

export type SheetProps = {
  open: boolean;
  /** Called on Escape and on a tap on the scrim. */
  onClose: () => void;
  title: string;
  /** Top-left text button, e.g. Cancel. */
  leftAction?: SheetAction;
  /** Top-right text button, e.g. Add. */
  rightAction?: SheetAction;
  children: ReactNode;
};

/** Bottom sheet with a grabber and a title row (06a). Renders inside the phone frame. */
export function Sheet({ open, onClose, title, leftAction, rightAction, children }: SheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModal(open, ref, onClose);
  if (!open) return null;
  return createPortal(
    <div className="k-overlay k-overlay--sheet">
      <div className="k-scrim" onClick={onClose} aria-hidden="true" />
      <div className="k-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <div className="k-sheet__grabber" aria-hidden="true" />
        <div className="k-sheet__head">
          {leftAction ? (
            <button type="button" className="k-sheet__action" onClick={leftAction.onClick} disabled={leftAction.disabled}>
              {leftAction.label}
            </button>
          ) : (
            <span />
          )}
          <h2 id={titleId} className="k-sheet__title">
            {title}
          </h2>
          {rightAction ? (
            <button
              type="button"
              className="k-sheet__action k-sheet__action--strong"
              onClick={rightAction.onClick}
              disabled={rightAction.disabled}
            >
              {rightAction.label}
            </button>
          ) : (
            <span />
          )}
        </div>
        <div className="k-sheet__body">{children}</div>
      </div>
    </div>,
    overlayRoot(),
  );
}
