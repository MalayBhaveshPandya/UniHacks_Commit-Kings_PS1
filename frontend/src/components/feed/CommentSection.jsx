import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Send } from 'lucide-react';
import Avatar from '../shared/Avatar';
import Button from '../shared/Button';
import AnonymousToggle from '../shared/AnonymousToggle';
import styles from './CommentSection.module.css';

export default function CommentSection({ comments = [], onComment }) {
  const [text, setText] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      await onComment({ text: text.trim(), anonymous });
      setText('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.section}>
      {/* Comments list */}
      {comments.length > 0 && (
        <div className={styles.list}>
          {comments.map((c) => (
            <div key={c._id} className={styles.comment}>
              <Avatar
                name={c.anonymous ? null : c.author?.name}
                anonymous={c.anonymous}
                size="sm"
              />
              <div className={styles['comment-body']}>
                <div className={styles['comment-header']}>
                  <span className={styles['comment-name']}>
                    {c.anonymous ? 'Anonymous' : c.author?.name || 'Unknown'}
                  </span>
                  <span className={styles['comment-time']}>
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className={styles['comment-text']}>{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className={styles['input-row']}>
        <div className={styles['input-wrap']}>
          <textarea
            className={styles.input}
            placeholder="Write a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
          />
          <div className={styles['input-actions']}>
            <AnonymousToggle active={anonymous} onChange={setAnonymous} label="Anon" />
            <Button size="sm" onClick={handleSubmit} loading={loading} disabled={!text.trim()} icon={Send}>
              Reply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
