import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon, type IconName } from './Icon.tsx';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'destructive-outline' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon. */
  icon?: IconName;
  /** Full width. */
  block?: boolean;
  children: ReactNode;
};

export type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

const ICON_SIZE: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 18 };

function classes(variant: ButtonVariant, size: ButtonSize, block: boolean, extra?: string) {
  return ['k-btn', `k-btn--${variant}`, `k-btn--${size}`, block ? 'k-btn--block' : '', extra ?? ''].filter(Boolean).join(' ');
}

/** Figma "Button" (313:191). Default: primary, lg. */
export function Button({ variant = 'primary', size = 'lg', icon, block = false, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={classes(variant, size, block, className)} {...rest}>
      {icon && <Icon name={icon} size={ICON_SIZE[size]} />}
      <span>{children}</span>
    </button>
  );
}

export type ButtonLinkProps = CommonProps & { to: string; className?: string; replace?: boolean };

/** Same look as Button, but navigates. */
export function ButtonLink({ variant = 'primary', size = 'lg', icon, block = false, className, children, to, replace }: ButtonLinkProps) {
  return (
    <Link to={to} replace={replace} className={classes(variant, size, block, className)}>
      {icon && <Icon name={icon} size={ICON_SIZE[size]} />}
      <span>{children}</span>
    </Link>
  );
}
