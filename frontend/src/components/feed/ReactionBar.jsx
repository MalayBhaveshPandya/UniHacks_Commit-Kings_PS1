import { useState } from 'react';
import { Plus } from 'lucide-react';
import styles from './ReactionBar.module.css';

const EMOJI_OPTIONS = ['👏', '🔥', '💡', '👀', '❤️', '🎯'];

export default function ReactionBar({ reactions = {}, onReact }) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const entries = Object.entries(reactions).filter(([, users]) => users.length > 0);

  return (
    <div className={styles.bar}>
      {entries.map(([emoji, users]) => (
        <button
          key={emoji}
          className={`${styles.reaction} ${styles['reaction--active']}`}
          onClick={() => onReact(emoji)}
        >
          <span className={styles['reaction-emoji']}>{emoji}</span>
          <span className={styles['reaction-count']}>{users.length}</span>
        </button>
      ))}

      <div style={{ position: 'relative' }}>
        <button
          className={styles['add-btn']}
          onClick={() => setPickerOpen(!pickerOpen)}
          aria-label="Add reaction"
        >
          <Plus size={14} />
        </button>
        {pickerOpen && (
          <div className={styles.picker} style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 4 }}>
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                className={styles['picker-emoji']}
                onClick={() => {
                  onReact(emoji);
                  setPickerOpen(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
