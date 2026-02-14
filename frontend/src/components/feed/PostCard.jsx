import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  MoreHorizontal,
  MessageCircle,
  Sparkles,
  Lightbulb,
  Trash2,
  Bookmark,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../shared/Avatar';
import ReactionBar from './ReactionBar';
import CommentSection from './CommentSection';
import AIFeedbackPanel from './AIFeedbackPanel';
import FormattedText from '../shared/FormattedText';
import styles from './PostCard.module.css';

export default function PostCard({ post, onReact, onComment, onDelete, onMarkInsight }) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isAuthor = !post.anonymous && user?._id === post.author?._id;
  const canMarkInsight = ['Admin', 'Reviewer'].includes(user?.role);
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const hasMenuItems = canMarkInsight || isAuthor;

  return (
    <article className={styles.card}>
      {/* Insight Badge (Top Ribbon/Corner) */}
      {post.isInsight && (
        <div className={styles['insight-ribbon']}>
          <Lightbulb size={12} fill="currentColor" />
          <span>Insightful</span>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles['header-left']}>
          <Avatar
            name={post.anonymous ? null : post.author?.name}
            anonymous={post.anonymous}
            size="md"
          />
          <div className={styles['author-info']}>
            <span className={styles['author-name']}>
              {post.anonymous ? 'Anonymous' : post.author?.name || 'Unknown'}
            </span>
            <div className={styles['author-meta']}>
              <span
                className={`${styles['type-badge']} ${styles[`type-badge--${post.type}`]}`}
              >
                {post.type}
              </span>
              <span>·</span>
              <span>{timeAgo}</span>
            </div>
          </div>
        </div>

        <div className={styles['header-right']} ref={menuRef}>
          {/* Menu button */}
          {hasMenuItems && (
            <>
              <button
                className={styles['menu-btn']}
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Post options"
              >
                <MoreHorizontal size={16} />
              </button>
              {menuOpen && (
                <div className={styles.dropdown}>
                  {canMarkInsight && (
                    <button
                      className={styles['dropdown-item']}
                      onClick={() => {
                        onMarkInsight?.(post._id);
                        setMenuOpen(false);
                      }}
                    >
                      <Bookmark size={14} />
                      {post.isInsight ? 'Remove Insight' : 'Mark as Insight'}
                    </button>
                  )}
                  {isAuthor && (
                    <button
                      className={`${styles['dropdown-item']} ${styles['dropdown-item--danger']}`}
                      onClick={() => {
                        onDelete?.(post._id);
                        setMenuOpen(false);
                      }}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <FormattedText text={post.content} />
      </div>

      {/* Tags */}
      {post.tags?.length > 0 && (
        <div className={styles.tags}>
          {post.tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Reactions & Stats */}
      <div className={styles['reaction-area']}>
        <ReactionBar reactions={post.reactions} onReact={(key) => onReact?.(post._id, key)} />

        {/* Comment Count Indicator */}
        {post.comments?.length > 0 && (
          <div className={styles['comment-count']}>
            <span>{post.comments.length} comments</span>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className={styles.footer}>
        <div className={styles.actions}>
          <button
            className={`${styles['action-btn']} ${showComments ? styles['action-btn--active'] : ''}`}
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle size={14} />
            Comment
          </button>

          {post.aiToggle && (
            <button
              className={`${styles['action-btn']} ${showAI ? styles['action-btn--active'] : ''}`}
              onClick={() => setShowAI(!showAI)}
            >
              <Sparkles size={14} />
              AI Feedback
            </button>
          )}
        </div>
      </div>

      {/* Comments */}
      {showComments && (
        <CommentSection
          comments={post.comments || []}
          onComment={(commentData) => onComment?.(post._id, commentData)}
        />
      )}

      {/* AI Feedback */}
      {showAI && (
        <AIFeedbackPanel
          text={post.content}
          postId={post._id}
          initialFeedbacks={post.aiFeedbacks}
        />
      )}
    </article>
  );
}
