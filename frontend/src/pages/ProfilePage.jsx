import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/shared/Avatar';
import Button from '../components/shared/Button';
import styles from './Profile.module.css';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    jobTitle: user?.jobTitle || '',
    sex: user?.sex || '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser(form);
      setSuccess(true);
    } catch {
      // error handled by context
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.profile}>
      <div className={styles.card}>
        <div className={styles['avatar-section']}>
          <Avatar name={user?.name} size="xl" />
          <div className={styles['avatar-info']}>
            <h2>{user?.name || 'User'}</h2>
            <p>{user?.role || 'Member'}</p>
          </div>
        </div>

        {success && <div className={styles.success}>Profile updated successfully!</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="profile-name">Full Name</label>
            <input
              id="profile-name"
              className={styles.input}
              name="name"
              value={form.name}
              onChange={handleChange}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="profile-title">Job Title</label>
              <input
                id="profile-title"
                className={styles.input}
                name="jobTitle"
                placeholder="e.g., Engineer"
                value={form.jobTitle}
                onChange={handleChange}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="profile-sex">Gender</label>
              <select
                id="profile-sex"
                className={styles.select}
                name="sex"
                value={form.sex}
                onChange={handleChange}
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className={styles.actions}>
            <Button type="submit" loading={saving}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
