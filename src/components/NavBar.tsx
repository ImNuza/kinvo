import { Fragment } from 'react';
import { Link, useNavigate } from 'react-router';
import { Icon } from './Icon.tsx';

export type Crumb = { label: string; to: string };

export type NavBarProps =
  | {
      /** Top-level tab screen: plain title, no buttons (01, 02, 06, 12). */
      title: string;
      trail?: never;
      current?: never;
      onBack?: never;
      backTo?: never;
      showHome?: never;
    }
  | {
      title?: never;
      /** Ancestors, left to right. The last one is where Back goes by default. */
      trail: Crumb[];
      current: string;
      /** Custom back handler. Default: go to the last crumb. */
      onBack?: () => void;
      /** Override the back target. */
      backTo?: string;
      /** Home button on the right (to /archive). Default true. */
      showHome?: boolean;
    };

/** Figma "Breadcrumb Bar" (331:708). */
export function NavBar(props: NavBarProps) {
  const navigate = useNavigate();

  if (props.title !== undefined) {
    return (
      <header className="k-navbar k-navbar--title">
        <h1 className="k-navbar__title">{props.title}</h1>
      </header>
    );
  }

  const { trail, current, onBack, backTo, showHome = true } = props;
  const backTarget = backTo ?? trail[trail.length - 1]?.to ?? '/archive';
  return (
    <header className="k-navbar">
      <button
        type="button"
        className="k-navbar__btn"
        aria-label="Back"
        onClick={() => (onBack ? onBack() : navigate(backTarget))}
      >
        <Icon name="back" size={18} />
      </button>
      <nav className="k-navbar__crumbs" aria-label="Breadcrumb">
        {trail.map((c) => (
          <Fragment key={c.to + c.label}>
            <Link to={c.to} className="k-navbar__crumb">
              {c.label}
            </Link>
            <Icon name="chev-right" size={14} className="k-navbar__sep" />
          </Fragment>
        ))}
        <h1 className="k-navbar__current" aria-current="page">
          {current}
        </h1>
      </nav>
      {showHome ? (
        <Link to="/archive" className="k-navbar__btn" aria-label="Home">
          <Icon name="home" size={18} />
        </Link>
      ) : (
        <span className="k-navbar__spacer" />
      )}
    </header>
  );
}
