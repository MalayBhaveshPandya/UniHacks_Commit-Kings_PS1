import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/shared/Button';
import styles from './Auth.module.css';

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setLocalError('All fields are required');
      return;
    }
    try {
      await login(form);
      navigate('/feed');
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const displayError = localError || error;

  return (
    <div className={styles.page}>
      {/* Left Panel */}
      <div className={styles.panel}>
        <div className={styles['panel-content']}>
          <div className={styles['panel-brand']}>
            <div className={styles['panel-mark']}>P</div>
            <div className={styles['panel-name']}>
              PS<span>1</span>
            </div>
          </div>

          <h2 className={styles['panel-tagline']}>
            Think freely,<br />write boldly.
          </h2>
          <p className={styles['panel-desc']}>
            A private space for your team to reflect, share, and grow — without the noise
            of public platforms.
          </p>

          <div className={styles['panel-features']}>
            <div className={styles.feature}>
              <span className={styles['feature-dot']} />
              Anonymous reflections & honest discussions
            </div>
            <div className={styles.feature}>
              <span className={styles['feature-dot']} />
              AI-powered multi-persona feedback
            </div>
            <div className={styles.feature}>
              <span className={styles['feature-dot']} />
              Meeting transcripts & knowledge vault
            </div>
            <div className={styles.feature}>
              <span className={styles['feature-dot']} />
              End-to-end organizational privacy
            </div>
          </div>
        </div>
      </div>

      {/* Right Form */}
      <div className={styles['form-side']}>
        <button className={styles['theme-toggle-auth']} onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className={styles['form-container']}>
          <div className={styles['form-header']}>
            <h1 className={styles['form-title']}>Welcome back</h1>
            <p className={styles['form-subtitle']}>
              Don&apos;t have an account? <Link to="/signup">Sign up</Link>
            </p>
          </div>

          {displayError && <div className={styles['form-error']}>{displayError}</div>}

          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                className={styles.input}
                type="email"
                name="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                className={styles.input}
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" fullWidth loading={loading} style={{ marginTop: 'var(--space-2)' }}>
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
