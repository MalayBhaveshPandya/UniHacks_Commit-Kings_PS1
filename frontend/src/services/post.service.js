import api from './api';
import { mockPosts } from './mock';

const USE_MOCK = !import.meta.env.VITE_API_URL || import.meta.env.VITE_USE_MOCK === 'true';
const getToken = () => localStorage.getItem('ps1_token');
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

/**
 * Normalize a post from backend format to frontend format.
 * Backend: { user, reactions: [{user, emoji}], comments: [{user, text}] }
 * Frontend: { author, reactions: {emoji: [userId]}, comments: [{author, text}] }
 */
function normalizePost(post) {
  if (!post) return post;

  // Map 'user' → 'author' if author isn't already set
  if (post.user && !post.author) {
    post.author = post.anonymous
      ? null
      : { _id: post.user._id, name: post.user.name, role: post.user.role };
  }

  // Map reactions array → reactions object { emoji: [userId, ...] }
  if (Array.isArray(post.reactions)) {
    const reactionsObj = {};
    for (const r of post.reactions) {
      const emoji = r.emoji;
      const userId = typeof r.user === 'object' ? r.user?._id : r.user;
      if (!reactionsObj[emoji]) reactionsObj[emoji] = [];
      if (userId) reactionsObj[emoji].push(userId);
    }
    post.reactions = reactionsObj;
  }

  // Map comments[].user → comments[].author
  if (Array.isArray(post.comments)) {
    post.comments = post.comments.map((c) => {
      if (c.user && !c.author) {
        c.author = c.anonymous
          ? null
          : { _id: c.user._id, name: c.user.name };
      }
      return c;
    });
  }

  return post;
}

export const postService = {
  async getPosts(filters = {}) {
    if (USE_MOCK) {
      await delay();
      return mockPosts.getPosts(filters);
    }
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.insightsOnly) params.set('insightsOnly', 'true');
    if (filters.tags) params.set('tags', filters.tags);
    params.set('page', filters.page || 1);
    const { data } = await api.get(`/posts?${params.toString()}`);
    // Normalize posts from backend format
    if (data.posts) {
      data.posts = data.posts.map(normalizePost);
    }
    return data;
  },

  async getPost(id) {
    if (USE_MOCK) {
      await delay(200);
      return mockPosts.getPost(id);
    }
    const { data } = await api.get(`/posts/${id}`);
    if (data.post) data.post = normalizePost(data.post);
    return data;
  },

  async createPost(postData) {
    if (USE_MOCK) {
      await delay(400);
      return mockPosts.createPost(getToken(), postData);
    }
    // Convert tags from comma-separated string to array for the backend
    const payload = { ...postData };
    if (typeof payload.tags === 'string') {
      payload.tags = payload.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    const { data } = await api.post('/posts', payload);
    if (data.post) data.post = normalizePost(data.post);
    return data;
  },

  async updatePost(id, updates) {
    if (USE_MOCK) {
      await delay(300);
      return mockPosts.updatePost(id, updates);
    }
    const { data } = await api.put(`/posts/${id}`, updates);
    if (data.post) data.post = normalizePost(data.post);
    return data;
  },

  async deletePost(id) {
    if (USE_MOCK) {
      await delay(300);
      return mockPosts.deletePost(id);
    }
    const { data } = await api.delete(`/posts/${id}`);
    return data;
  },

  async reactToPost(id, emoji) {
    if (USE_MOCK) {
      await delay(100);
      return mockPosts.reactToPost(getToken(), id, emoji);
    }
    const { data } = await api.post(`/posts/${id}/react`, { emoji });
    if (data.post) data.post = normalizePost(data.post);
    return data;
  },

  async commentOnPost(id, commentData) {
    if (USE_MOCK) {
      await delay(300);
      return mockPosts.commentOnPost(getToken(), id, commentData);
    }
    const { data } = await api.post(`/posts/${id}/comment`, commentData);
    if (data.post) data.post = normalizePost(data.post);
    return data;
  },

  async repost(id) {
    const { data } = await api.post(`/posts/${id}/repost`);
    if (data.post) data.post = normalizePost(data.post);
    return data;
  },

  async markAsInsight(id) {
    if (USE_MOCK) {
      await delay(200);
      return mockPosts.markAsInsight(id);
    }
    const { data } = await api.post(`/posts/${id}/insight`);
    if (data.post) data.post = normalizePost(data.post);
    return data;
  },

  async saveAIFeedback(id, feedbacks) {
    if (USE_MOCK) {
      await delay(300);
      return { post: { _id: id } }; // Mock response
    }
    const { data } = await api.post(`/posts/${id}/ai-feedback`, { feedbacks });
    if (data.post) data.post = normalizePost(data.post);
    return data;
  },
};
