import type { ReactNode } from 'react';
import { TabBar, type Tab } from './TabBar.tsx';

export type ScreenProps = {
  /** Usually a <NavBar />. */
  nav: ReactNode;
  children: ReactNode;
  /** Sticky actions above the tab bar, e.g. the Stop button on 03. */
  footer?: ReactNode;
  /** Hide the tab bar (09a, 09b). Default false. */
  hideTabBar?: boolean;
  /** Force the active tab, e.g. "family" on /stories/... screens. */
  tab?: Tab;
  /** Extra class on the scroll body, for screen-specific layout. */
  bodyClassName?: string;
};

/** One phone screen: nav bar, scrolling body, optional footer, tab bar. */
export function Screen({ nav, children, footer, hideTabBar = false, tab, bodyClassName }: ScreenProps) {
  return (
    <div className="k-screen">
      {nav}
      <main className={['k-screen__body', bodyClassName ?? ''].filter(Boolean).join(' ')}>{children}</main>
      {footer && <div className="k-screen__footer">{footer}</div>}
      {!hideTabBar && <TabBar active={tab} />}
    </div>
  );
}
