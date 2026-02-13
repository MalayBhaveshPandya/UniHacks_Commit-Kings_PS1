import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Menu, LogOut, UserCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Avatar from '../shared/Avatar';
import styles from './Topbar.module.css';

export default function Topbar({ sidebarCollapsed, onMobileMenuToggle, pageTitle }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className={`${styles.topbar} ${sidebarCollapsed ? styles['topbar--collapsed'] : styles['topbar--expanded']
        }`}
    >
      <div className={styles.left}>
        <button className={styles.hamburger} onClick={onMobileMenuToggle} aria-label="Menu">
          <Menu size={22} />
        </button>
        {pageTitle && <h1 className={styles['page-title']}>{pageTitle}</h1>}
      </div>

      <div className={styles.right}>
        {/* Theme Toggle */}
        <button className={styles['theme-toggle']} onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button className={styles['user-btn']} onClick={() => setDropdownOpen(!dropdownOpen)}>
            <Avatar name={user?.name} size="sm" />
            <div style={{ textAlign: 'left' }}>
              <div className={styles['user-name']}>{user?.name}</div>
              <div className={styles['user-role']}>{user?.role}</div>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />
          </button>

          {dropdownOpen && (
            <div className={styles.dropdown}>
              <button
                className={styles['dropdown-item']}
                onClick={() => {
                  navigate('/profile');
                  setDropdownOpen(false);
                }}
              >
                <UserCircle size={16} /> Profile
              </button>
              <button
                className={`${styles['dropdown-item']} ${styles['dropdown-item--danger']}`}
                onClick={handleLogout}
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
