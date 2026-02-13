import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/shared/Button';
import styles from './Auth.module.css';

const ROLES = [
  { value: 'member', label: 'Member' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'ceo', label: 'CEO / Admin' },
];

export default function SignupPage() {
  const { signup, loading, error } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    orgCode: '',
    role: 'member',
  });
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.orgCode) {
      setLocalError('All fields are required');
      return;
    }
    if (form.password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }
    try {
      await signup(form);
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
            Your team&apos;s<br />private canvas.
          </h2>
          <p className={styles['panel-desc']}>
            Create your organization&apos;s private space. Reflect honestly, share openly,
            and let AI amplify your thinking.
          </p>

          <div className={styles['panel-features']}>
            <div className={styles.feature}>
              <span className={styles['feature-dot']} />
              Post reflections, decisions & updates
            </div>
            <div className={styles.feature}>
              <span className={styles['feature-dot']} />
              Real-time team & direct messaging
            </div>
            <div className={styles.feature}>
              <span className={styles['feature-dot']} />
              AI analyzes from Investor, Optimist & more
            </div>
            <div className={styles.feature}>
              <span className={styles['feature-dot']} />
              Psychological safety built in
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
            <h1 className={styles['form-title']}>Create account</h1>
            <p className={styles['form-subtitle']}>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>

          {displayError && <div className={styles['form-error']}>{displayError}</div>}

          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="signup-name">
                Full Name
              </label>
              <input
                id="signup-name"
                className={styles.input}
                type="text"
                name="name"
                placeholder="Jane Doe"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="signup-email">
                Email
              </label>
              <input
                id="signup-email"
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
              <label className={styles.label} htmlFor="signup-password">
                Password
              </label>
              <input
                id="signup-password"
                className={styles.input}
                type="password"
                name="password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="signup-org">
                  Org Code
                </label>
                <input
                  id="signup-org"
                  className={styles.input}
                  type="text"
                  name="orgCode"
                  placeholder="ACME-123"
                  value={form.orgCode}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="signup-role">
                  Role
                </label>
                <select
                  id="signup-role"
                  className={styles.select}
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button type="submit" fullWidth loading={loading} style={{ marginTop: 'var(--space-2)' }}>
              Create Account
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
