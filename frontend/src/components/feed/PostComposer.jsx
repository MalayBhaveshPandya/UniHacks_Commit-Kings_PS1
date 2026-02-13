import { useState } from 'react';
import { Send, Sparkles, Tag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../shared/Avatar';
import Button from '../shared/Button';
import AnonymousToggle from '../shared/AnonymousToggle';
import styles from './PostComposer.module.css';

const POST_TYPES = ['reflection', 'update', 'decision', 'meeting'];

export default function PostComposer({ onPost }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [type, setType] = useState('reflection');
  const [anonymous, setAnonymous] = useState(false);
  const [aiToggle, setAiToggle] = useState(false);
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await onPost({ content: content.trim(), type, anonymous, aiToggle, tags });
      setContent('');
      setTags('');
      setAnonymous(false);
      setAiToggle(false);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className={styles.composer}>
      <div className={styles['composer-header']}>
        <Avatar name={anonymous ? null : user?.name} anonymous={anonymous} size="md" />
        <div className={styles['composer-input']}>
          <textarea
            className={styles.textarea}
            placeholder="What's on your mind? Share a reflection, update, or decision..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
          />
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles['toolbar-left']}>
          {/* Type pills */}
          <div className={styles['type-pills']}>
            {POST_TYPES.map((t) => (
              <button
                key={t}
                className={`${styles['type-pill']} ${type === t ? styles['type-pill--active'] : ''}`}
                onClick={() => setType(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tags */}
          <div className={styles['tags-input']}>
            <Tag size={12} style={{ color: 'var(--text-tertiary)' }} />
            <input
              className={styles['tags-field']}
              placeholder="tags (comma sep)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
        </div>

        <div className={styles['toolbar-right']}>
          {/* Anonymous Toggle */}
          <AnonymousToggle active={anonymous} onChange={setAnonymous} label="Anon" />

          {/* AI Toggle */}
          <button
            className={`${styles['ai-toggle']} ${aiToggle ? styles['ai-toggle--active'] : ''}`}
            onClick={() => setAiToggle(!aiToggle)}
          >
            <Sparkles size={14} />
            AI
          </button>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            loading={loading}
            disabled={!content.trim()}
            icon={Send}
            size="sm"
          >
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}
