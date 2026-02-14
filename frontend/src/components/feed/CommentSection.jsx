import { useState, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Send, Smile, Bold } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../shared/Avatar';
import Button from '../shared/Button';
import AnonymousToggle from '../shared/AnonymousToggle';
import FormattedText from '../shared/FormattedText';
import styles from './CommentSection.module.css';

export default function CommentSection({ comments = [], onComment }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const textareaRef = useRef(null);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      await onComment({ text: text.trim(), anonymous });
      setText('');
      setShowPicker(false);
    } finally {
      setLoading(false);
    }
  };

  const handleEmojiClick = (emojiData) => {
    const cursor = textareaRef.current.selectionStart;
    const newText = text.slice(0, cursor) + emojiData.emoji + text.slice(cursor);
    setText(newText);
    setTimeout(() => {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(cursor + emojiData.emoji.length, cursor + emojiData.emoji.length);
    }, 0);
  };

  const handleBoldClick = () => {
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selection = text.substring(start, end);
    const newText = text.substring(0, start) + `**${selection || 'bold'}**` + text.substring(end);
    setText(newText);
    setTimeout(() => {
      textareaRef.current.focus();
      // If there was no selection, place cursor inside the bold markers
      const newCursorPos = selection ? end + 4 : start + 6; // **text** (start+2+len+2) or **bold** (start+2+4)
      const cursorPos = selection ? end + 4 : start + 2 + 4; // existing logic slightly off
      // Let's just focus at end of insertion for now or inside if empty
      if (!selection) {
        textareaRef.current.setSelectionRange(start + 2, start + 6); // select 'bold'
      } else {
        textareaRef.current.setSelectionRange(end + 4, end + 4);
      }
    }, 0);
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
                <div className={styles['comment-text']}>
                  <FormattedText text={c.text} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className={styles['input-row']}>
        <Avatar name={anonymous ? null : user?.name} anonymous={anonymous} size="sm" />
        <div className={styles['input-wrap']}>
          <textarea
            ref={textareaRef}
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
            <div className={styles['formatting-tools']}>
              <button
                className={styles['tool-btn']}
                onClick={() => setShowPicker(!showPicker)}
                title="Add Emoji"
              >
                <Smile size={18} />
              </button>
              <button
                className={styles['tool-btn']}
                onClick={handleBoldClick}
                title="Bold Text"
              >
                <Bold size={18} />
              </button>

              {showPicker && (
                <div className={styles['emoji-picker-popover']}>
                  <div className={styles['emoji-overlay']} onClick={() => setShowPicker(false)} />
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    width={300}
                    height={400}
                    theme="light"
                  />
                </div>
              )}
            </div>

            <div className={styles['action-right']}>
              <AnonymousToggle active={anonymous} onChange={setAnonymous} label="Comment Anonymously" />
              <Button size="sm" onClick={handleSubmit} loading={loading} disabled={!text.trim()} icon={Send}>
                Reply
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
