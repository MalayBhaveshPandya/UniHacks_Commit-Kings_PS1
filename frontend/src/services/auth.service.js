import api from './api';

export const authService = {
  async signup({ name, email, password, orgCode, role }) {
    const { data } = await api.post('/auth/signup', { name, email, password, orgCode, role });
    return data;
  },

  async login({ email, password }) {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  async getMe() {
    const { data } = await api.get('/auth/me');
    return data;
  },

  async updateProfile(updates) {
    const { data } = await api.put('/auth/profile', updates);
    return data;
  },
};
