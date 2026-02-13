import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Mic,
  UserCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { label: 'Feed', path: '/feed', icon: LayoutDashboard },
  { label: 'Chat', path: '/chat', icon: MessageSquare },
  { label: 'Meetings', path: '/meetings', icon: Mic },
  { label: 'Profile', path: '/profile', icon: UserCircle },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen }) {
  const location = useLocation();

  const sidebarClass = [
    styles.sidebar,
    collapsed && styles['sidebar--collapsed'],
    mobileOpen && styles['sidebar--open'],
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={sidebarClass}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles['brand-mark']}>P</div>
        {!collapsed && (
          <div className={styles['brand-text']}>
            PS<span>1</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles['nav-section']}>
          {!collapsed && <div className={styles['nav-label']}>Navigate</div>}
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `${styles['nav-item']} ${isActive ? styles['nav-item--active'] : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <span className={styles['nav-item-icon']}>
                <item.icon size={20} />
              </span>
              {!collapsed && <span className={styles['nav-item-text']}>{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className={styles.footer}>
        <button className={styles['collapse-btn']} onClick={onToggle} aria-label="Toggle sidebar">
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>
    </aside>
  );
}
