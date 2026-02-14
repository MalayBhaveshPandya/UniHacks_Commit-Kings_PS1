import { EyeOff, Eye } from 'lucide-react';
import styles from './AnonymousToggle.module.css';

export default function AnonymousToggle({ active, onChange, label = 'Post Anonymously' }) {
  return (
    <label className={styles.toggle}>
      <div className={`${styles.track} ${active ? styles['track--active'] : ''}`}>
        <div className={styles.thumb} />
      </div>
      <span className={`${styles.label} ${active ? styles['label--active'] : ''}`}>
        {active ? <EyeOff size={14} /> : <Eye size={14} />}
        {label}
      </span>
      <input
        type="checkbox"
        checked={active}
        onChange={(e) => onChange(e.target.checked)}
        style={{ display: 'none' }}
        aria-label={label}
      />
    </label>
  );
}
