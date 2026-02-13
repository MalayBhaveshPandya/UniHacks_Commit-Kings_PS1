import api from './api';
import { mockChat } from './mock';

const USE_MOCK = !import.meta.env.VITE_API_URL || import.meta.env.VITE_USE_MOCK === 'true';
const getToken = () => localStorage.getItem('ps1_token');
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export const chatService = {
  async getConversations() {
    if (USE_MOCK) {
      await delay(200);
      return mockChat.getConversations();
    }
    const { data } = await api.get('/chat/conversations');
    return data;
  },

  async getMessages(conversationId) {
    if (USE_MOCK) {
      await delay(200);
      return mockChat.getMessages(conversationId);
    }
    const { data } = await api.get(`/chat/conversations/${conversationId}/messages`);
    return data;
  },

  async sendMessage(conversationId, messageData) {
    if (USE_MOCK) {
      await delay(150);
      return mockChat.sendMessage(getToken(), conversationId, messageData);
    }
    const { data } = await api.post(`/chat/conversations/${conversationId}/messages`, messageData);
    return data;
  },

  async markMessageInsight(conversationId, messageId) {
    if (USE_MOCK) {
      await delay(100);
      return mockChat.markMessageInsight(conversationId, messageId);
    }
    const { data } = await api.post(`/chat/messages/${messageId}/insight`);
    return data;
  },

  async createConversation(convData) {
    if (USE_MOCK) {
      await delay(200);
      return mockChat.createConversation(getToken(), convData);
    }
    const { data } = await api.post('/chat/conversations', convData);
    return data;
  },
};
