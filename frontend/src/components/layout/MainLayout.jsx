import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import styles from './MainLayout.module.css';

const PAGE_TITLES = {
  '/feed': 'Feed',
  '/chat': 'Chat',
  '/meetings': 'Meetings',
  '/profile': 'Profile',
};

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const pageTitle = PAGE_TITLES[location.pathname] || '';

  return (
    <div className={styles.layout}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
      />

      {mobileOpen && (
        <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      <Topbar
        sidebarCollapsed={collapsed}
        onMobileMenuToggle={() => setMobileOpen(!mobileOpen)}
        pageTitle={pageTitle}
      />

      <main
        className={`${styles.main} ${collapsed ? styles['main--collapsed'] : styles['main--expanded']
          }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
