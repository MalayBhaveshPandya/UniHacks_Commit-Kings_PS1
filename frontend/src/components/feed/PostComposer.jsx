import { useState, useRef } from 'react';
import { Send, Sparkles, Tag, Smile, Bold } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
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
  const [showPicker, setShowPicker] = useState(false);
  const textareaRef = useRef(null);

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

  const handleEmojiClick = (emojiData) => {
    const cursor = textareaRef.current.selectionStart;
    const newText = content.slice(0, cursor) + emojiData.emoji + content.slice(cursor);
    setContent(newText);
    setTimeout(() => {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(cursor + emojiData.emoji.length, cursor + emojiData.emoji.length);
    }, 0);
  };

  const handleBoldClick = () => {
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selection = content.substring(start, end);
    const newText = content.substring(0, start) + `**${selection || 'bold'}**` + content.substring(end);
    setContent(newText);
    setTimeout(() => {
      textareaRef.current.focus();
      if (!selection) {
        textareaRef.current.setSelectionRange(start + 2, start + 6);
      } else {
        textareaRef.current.setSelectionRange(end + 4, end + 4);
      }
    }, 0);
  };

  return (
    <div className={styles.composer}>
      <div className={styles['composer-title']}>
        <h3>Create New Post</h3>
      </div>
      <div className={styles['composer-header']}>
        <Avatar name={anonymous ? null : user?.name} anonymous={anonymous} size="md" />
        <div className={styles['composer-input']}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            placeholder="What's on your mind? Share a reflection, update, or decision..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
          />
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
          <AnonymousToggle active={anonymous} onChange={setAnonymous} label="Post Anonymously" />

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
