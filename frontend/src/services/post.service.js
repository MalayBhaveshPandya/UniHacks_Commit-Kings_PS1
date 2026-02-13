import api from './api';
import { mockPosts } from './mock';

const USE_MOCK = !import.meta.env.VITE_API_URL || import.meta.env.VITE_USE_MOCK === 'true';
const getToken = () => localStorage.getItem('ps1_token');
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

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
    return data;
  },

  async getPost(id) {
    if (USE_MOCK) {
      await delay(200);
      return mockPosts.getPost(id);
    }
    const { data } = await api.get(`/posts/${id}`);
    return data;
  },

  async createPost(postData) {
    if (USE_MOCK) {
      await delay(400);
      return mockPosts.createPost(getToken(), postData);
    }
    const { data } = await api.post('/posts', postData);
    return data;
  },

  async updatePost(id, updates) {
    if (USE_MOCK) {
      await delay(300);
      return mockPosts.updatePost(id, updates);
    }
    const { data } = await api.put(`/posts/${id}`, updates);
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
    return data;
  },

  async commentOnPost(id, commentData) {
    if (USE_MOCK) {
      await delay(300);
      return mockPosts.commentOnPost(getToken(), id, commentData);
    }
    const { data } = await api.post(`/posts/${id}/comment`, commentData);
    return data;
  },

  async repost(id) {
    const { data } = await api.post(`/posts/${id}/repost`);
    return data;
  },

  async markAsInsight(id) {
    if (USE_MOCK) {
      await delay(200);
      return mockPosts.markAsInsight(id);
    }
    const { data } = await api.post(`/posts/${id}/insight`);
    return data;
  },
};
