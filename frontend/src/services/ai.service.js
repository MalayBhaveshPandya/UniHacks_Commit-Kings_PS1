import api from './api';
import { mockAI } from './mock';

const USE_MOCK = !import.meta.env.VITE_API_URL || import.meta.env.VITE_USE_MOCK === 'true';

export const aiService = {
  async getFeedback({ text, personas = ['investor', 'critical', 'optimist', 'team_lead'] }) {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 800)); // Simulate AI thinking time
      return mockAI.getFeedback({ text, personas });
    }
    const { data } = await api.post('/chat/ai-feedback', { text, personas });
    return data;
  },
};
