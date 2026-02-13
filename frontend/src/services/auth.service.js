import api from './api';
import { mockAuth } from './mock';

// Set to true to use mock backend (no server needed)
const USE_MOCK = !import.meta.env.VITE_API_URL || import.meta.env.VITE_USE_MOCK === 'true';

export const authService = {
  async signup(formData) {
    if (USE_MOCK) {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 400));
      return mockAuth.signup(formData);
    }
    const { data } = await api.post('/auth/signup', formData);
    return data;
  },

  async login(credentials) {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      return mockAuth.login(credentials);
    }
    const { data } = await api.post('/auth/login', credentials);
    return data;
  },

  async getMe() {
    if (USE_MOCK) {
      const token = localStorage.getItem('ps1_token');
      if (!token) throw { response: { status: 401 } };
      return mockAuth.getMe(token);
    }
    const { data } = await api.get('/auth/me');
    return data;
  },

  async updateProfile(updates) {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      const token = localStorage.getItem('ps1_token');
      return mockAuth.updateProfile(token, updates);
    }
    const { data } = await api.put('/auth/profile', updates);
    return data;
  },
};
