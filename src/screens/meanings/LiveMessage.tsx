import type { ReactNode } from 'react';

type LiveMessageProps = {
  children: ReactNode;
  /** Class for the visible copy, e.g. "t-danger". */
  className?: string;
};

/**
 * Status text that screen readers hear when it changes. The live region always exists
 * (hidden, so it takes no space). The visible copy shows only when there is a message.
 */
export function LiveMessage({ children, className }: LiveMessageProps) {
  return (
    <>
      <p className="sr-only" role="status">
        {children}
      </p>
      {children ? (
        <p className={className} aria-hidden="true">
          {children}
        </p>
      ) : null}
    </>
  );
}
