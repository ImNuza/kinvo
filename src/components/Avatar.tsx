export type AvatarSize = 32 | 40 | 56 | 72;

export type AvatarProps = {
  initials: string;
  size?: AvatarSize;
  status?: 'online' | 'offline' | 'none';
  /** Accessible name, e.g. "Auntie Lin, online". Leave empty when a visible name sits next to it. */
  label?: string;
  className?: string;
};

/** Figma "Avatar" (314:215): clay-tint circle with initials and an optional status dot. */
export function Avatar({ initials, size = 40, status = 'none', label, className }: AvatarProps) {
  return (
    <span
      className={['k-avatar', `k-avatar--${size}`, className ?? ''].filter(Boolean).join(' ')}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {initials}
      {status !== 'none' && <span className={`k-avatar__dot k-avatar__dot--${status}`} />}
    </span>
  );
}
