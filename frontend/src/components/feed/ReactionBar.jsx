import { ThumbsUp, ThumbsDown, Repeat2, Lightbulb, Flame } from 'lucide-react';
import styles from './ReactionBar.module.css';

const REACTIONS = [
  { key: 'like', icon: ThumbsUp, label: 'Like' },
  { key: 'dislike', icon: ThumbsDown, label: 'Dislike' },
  { key: 'repost', icon: Repeat2, label: 'Repost' },
  { key: 'fire', icon: Flame, label: 'Fire' },
];

export default function ReactionBar({ reactions = {}, onReact }) {
  return (
    <div className={styles.bar}>
      {REACTIONS.map((r, i) => {
        const users = reactions[r.key] || [];
        const isActive = users.length > 0;
        return (
          <span key={r.key} style={{ display: 'contents' }}>
            <button
              className={`${styles.reaction} ${styles[`reaction--${r.key}`]} ${isActive ? styles['reaction--active'] : ''}`}
              onClick={() => onReact(r.key)}
              title={r.label}
            >
              <r.icon size={15} />
              {users.length > 0 && <span className={styles['reaction-count']}>{users.length}</span>}
            </button>
            {i < REACTIONS.length - 1 && <span className={styles.divider} />}
          </span>
        );
      })}
    </div>
  );
}
