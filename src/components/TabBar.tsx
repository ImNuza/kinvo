import { NavLink } from 'react-router';
import { Icon, type IconName } from './Icon.tsx';

export type Tab = 'archive' | 'record' | 'family' | 'lessons';

const TABS: { id: Tab; label: string; icon: IconName; to: string }[] = [
  { id: 'archive', label: 'Archive', icon: 'calendar', to: '/archive' },
  { id: 'record', label: 'Record', icon: 'mic', to: '/record' },
  { id: 'family', label: 'Family', icon: 'family', to: '/family' },
  { id: 'lessons', label: 'Lessons', icon: 'book', to: '/lessons' },
];

export type TabBarProps = {
  /** Force the active tab. By default the tab matches the first URL segment. */
  active?: Tab;
};

/** Figma "Navbar" (314:155). Links, so a route blocker (useBlocker) can stop them. */
export function TabBar({ active }: TabBarProps) {
  return (
    <nav className="k-tabbar" aria-label="Main">
      {TABS.map((tab) => (
        <NavLink
          key={tab.id}
          to={tab.to}
          className={({ isActive }) => {
            const on = active ? active === tab.id : isActive;
            return on ? 'k-tabbar__tab k-tabbar__tab--active' : 'k-tabbar__tab';
          }}
          aria-current={active === tab.id ? 'page' : undefined}
        >
          <span className="k-tabbar__icon">
            <Icon name={tab.icon} size={20} />
          </span>
          <span className="k-tabbar__label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
