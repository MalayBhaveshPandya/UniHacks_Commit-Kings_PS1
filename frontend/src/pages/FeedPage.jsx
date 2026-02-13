import { useState, useEffect, useCallback } from 'react';
import { Search, Lightbulb, Newspaper } from 'lucide-react';
import { postService } from '../services/post.service';
import PostComposer from '../components/feed/PostComposer';
import PostCard from '../components/feed/PostCard';
import { Loader } from '../components/shared/Loader';
import EmptyState from '../components/shared/EmptyState';
import styles from './Feed.module.css';

const POST_TYPES = ['all', 'reflection', 'update', 'decision', 'meeting'];

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [insightsOnly, setInsightsOnly] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (typeFilter !== 'all') filters.type = typeFilter;
      if (keyword.trim()) filters.keyword = keyword.trim();
      if (insightsOnly) filters.insightsOnly = 'true';
      const data = await postService.getPosts(filters);
      setPosts(data.posts);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, keyword, insightsOnly]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPosts();
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleCreatePost = async (postData) => {
    const { post } = await postService.createPost(postData);
    setPosts((prev) => [post, ...prev]);
  };

  const handleReact = async (postId, emoji) => {
    const { post } = await postService.reactToPost(postId, emoji);
    setPosts((prev) => prev.map((p) => (p._id === postId ? post : p)));
  };

  const handleComment = async (postId, commentData) => {
    const { post } = await postService.commentOnPost(postId, commentData);
    setPosts((prev) => prev.map((p) => (p._id === postId ? post : p)));
  };

  const handleDelete = async (postId) => {
    await postService.deletePost(postId);
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  const handleMarkInsight = async (postId) => {
    const { post } = await postService.markAsInsight(postId);
    setPosts((prev) => prev.map((p) => (p._id === postId ? post : p)));
  };

  return (
    <div className={styles.feed}>
      {/* Post Composer */}
      <PostComposer onPost={handleCreatePost} />

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles['search-wrap']}>
          <Search size={16} className={styles['search-icon']} />
          <input
            className={styles.search}
            type="text"
            placeholder="Search posts..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className={styles['filter-pills']}>
          {POST_TYPES.map((t) => (
            <button
              key={t}
              className={`${styles.pill} ${typeFilter === t ? styles['pill--active'] : ''}`}
              onClick={() => setTypeFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          className={`${styles['insight-pill']} ${insightsOnly ? styles['insight-pill--active'] : ''}`}
          onClick={() => setInsightsOnly(!insightsOnly)}
        >
          <Lightbulb size={12} />
          Insights
        </button>
      </div>

      {/* Posts */}
      {loading ? (
        <Loader text="Loading feed..." />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No posts yet"
          description={
            keyword || typeFilter !== 'all' || insightsOnly
              ? 'No posts match your filters. Try adjusting them.'
              : 'Be the first to share a reflection or update with your team.'
          }
        />
      ) : (
        posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            onReact={handleReact}
            onComment={handleComment}
            onDelete={handleDelete}
            onMarkInsight={handleMarkInsight}
          />
        ))
      )}
    </div>
  );
}
