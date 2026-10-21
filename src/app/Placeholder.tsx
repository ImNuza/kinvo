import { NavBar, Screen, type Crumb, type Tab } from '../components/index.ts';

type PlaceholderProps = {
  /** Figma frame name, e.g. "04 Save this take". */
  frame: string;
  /** Top-level title, or a breadcrumb trail plus current label. */
  title?: string;
  trail?: Crumb[];
  current?: string;
  tab?: Tab;
  hideTabBar?: boolean;
};

/** Temporary screen until the owner builds the real one. */
export function Placeholder({ frame, title, trail, current, tab, hideTabBar }: PlaceholderProps) {
  const nav = trail ? <NavBar trail={trail} current={current ?? frame} /> : <NavBar title={title ?? frame} />;
  return (
    <Screen nav={nav} tab={tab} hideTabBar={hideTabBar}>
      <div className="k-card stack gap-2">
        <p className="t-subtitle">{frame}</p>
        <p className="t-muted">This screen is being built.</p>
      </div>
    </Screen>
  );
}
