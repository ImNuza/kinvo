import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon.tsx';

export type PillKind = 'draft' | 'waiting' | 'differ' | 'agreed' | 'ready' | 'streak';

const DEFAULTS: Record<PillKind, { icon: IconName; label: string }> = {
  draft: { icon: 'pencil', label: 'Draft' },
  waiting: { icon: 'clock', label: 'Waiting' },
  differ: { icon: 'warn', label: 'Meanings differ' },
  agreed: { icon: 'check', label: 'Agreed' },
  ready: { icon: 'check', label: 'Ready' },
  streak: { icon: 'flame', label: 'Streak' },
};

export type PillProps = {
  kind: PillKind;
  /** Overrides the default label, e.g. "4 day streak". */
  children?: ReactNode;
  className?: string;
};

/** Figma "Pill" (314:182). A status label, not a button. */
export function Pill({ kind, children, className }: PillProps) {
  const def = DEFAULTS[kind];
  return (
    <span className={['k-pill', `k-pill--${kind}`, className ?? ''].filter(Boolean).join(' ')}>
      <Icon name={def.icon} size={12} />
      <span>{children ?? def.label}</span>
    </span>
  );
}
