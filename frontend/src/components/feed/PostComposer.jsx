import { useState, useRef } from 'react';
import { Send, Sparkles, Tag, Smile, Bold, Image, Film, X, Upload } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../../context/AuthContext';
import { uploadService } from '../../services/upload.service';
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
  const fileInputRef = useRef(null);

  // Media state
  const [mediaFiles, setMediaFiles] = useState([]); // { file, preview, type }
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSubmit = async () => {
    if (!content.trim() && mediaFiles.length === 0) return;
    setLoading(true);
    try {
      let uploadedMedia = [];

      // Upload media files if any
      if (mediaFiles.length > 0) {
        setUploading(true);
        setUploadProgress(0);
        const files = mediaFiles.map((m) => m.file);
        const results = await uploadService.uploadMultiple(files, setUploadProgress);
        uploadedMedia = results.map((r) => ({
          url: r.url,
          publicId: r.publicId,
          resourceType: r.resourceType,
          width: r.width,
          height: r.height,
          format: r.format,
          duration: r.duration,
        }));
        setUploading(false);
      }

      await onPost({
        content: content.trim(),
        type,
        anonymous,
        aiToggle,
        tags,
        media: uploadedMedia,
      });
      setContent('');
      setTags('');
      setAnonymous(false);
      setAiToggle(false);
      setMediaFiles([]);
      setUploadProgress(0);
    } catch (err) {
      console.error('Post failed:', err);
      setUploading(false);
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

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Limit to 4 media items
    const remaining = 4 - mediaFiles.length;
    const selected = files.slice(0, remaining);

    const newMedia = selected.map((file) => {
      const isVideo = file.type.startsWith('video/');
      return {
        file,
        preview: URL.createObjectURL(file),
        type: isVideo ? 'video' : 'image',
        name: file.name,
        size: file.size,
      };
    });

    setMediaFiles((prev) => [...prev, ...newMedia]);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removeMedia = (index) => {
    setMediaFiles((prev) => {
      const removed = prev[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
            <button
              className={styles['tool-btn']}
              onClick={() => fileInputRef.current?.click()}
              title="Add Photo or Video"
              disabled={mediaFiles.length >= 4}
            >
              <Image size={18} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

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

      {/* Media Previews */}
      {mediaFiles.length > 0 && (
        <div className={styles['media-preview-grid']}>
          {mediaFiles.map((media, index) => (
            <div key={index} className={styles['media-preview-item']}>
              {media.type === 'video' ? (
                <div className={styles['media-preview-video']}>
                  <video src={media.preview} className={styles['media-preview-content']} />
                  <div className={styles['media-video-badge']}>
                    <Film size={12} />
                    Video
                  </div>
                </div>
              ) : (
                <img
                  src={media.preview}
                  alt={`Preview ${index}`}
                  className={styles['media-preview-content']}
                />
              )}
              <button
                className={styles['media-remove-btn']}
                onClick={() => removeMedia(index)}
                title="Remove"
              >
                <X size={14} />
              </button>
              <div className={styles['media-info']}>
                <span>{formatFileSize(media.size)}</span>
              </div>
            </div>
          ))}
          {mediaFiles.length < 4 && (
            <button
              className={styles['media-add-more']}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={20} />
              <span>Add more</span>
            </button>
          )}
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className={styles['upload-progress']}>
          <div className={styles['upload-progress-bar']}>
            <div
              className={styles['upload-progress-fill']}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className={styles['upload-progress-text']}>
            Uploading... {uploadProgress}%
          </span>
        </div>
      )}

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
            loading={loading || uploading}
            disabled={!content.trim() && mediaFiles.length === 0}
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
