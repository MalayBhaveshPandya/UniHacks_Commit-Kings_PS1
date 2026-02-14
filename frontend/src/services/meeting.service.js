import api from './api';
import { mockMeetings } from './mock';

const USE_MOCK = !import.meta.env.VITE_API_URL || import.meta.env.VITE_USE_MOCK === 'true';
const getToken = () => localStorage.getItem('ps1_token');
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export const meetingService = {
  async getMeetings(filters = {}) {
    if (USE_MOCK) {
      await delay(250);
      return mockMeetings.getMeetings(filters);
    }
    const { data } = await api.get('/meetings', { params: filters });
    return data;
  },

  async getMeeting(id) {
    if (USE_MOCK) {
      await delay(200);
      return mockMeetings.getMeeting(id);
    }
    const { data } = await api.get(`/meetings/${id}`);
    return data;
  },

  async createMeeting(meetingData) {
    if (USE_MOCK) {
      await delay(300);
      return mockMeetings.createMeeting(getToken(), meetingData);
    }
    const { data } = await api.post('/meetings', meetingData);
    return data;
  },

  // Start a live meeting (generates Jitsi room)
  async startMeeting(title) {
    const { data } = await api.post('/meetings/start', { title });
    return data;
  },

  // End a live meeting
  async endMeeting(id) {
    const { data } = await api.post(`/meetings/${id}/end`);
    return data;
  },

  // Update transcript for a meeting
  async updateTranscript(id, transcript) {
    const { data } = await api.put(`/meetings/${id}/transcript`, { transcript });
    return data;
  },

  // AI Summarize transcript
  async summarizeTranscript(id) {
    const { data } = await api.post(`/meetings/${id}/summarize`);
    return data;
  },

  // Transcribe audio file
  async transcribeAudio(file) {
    const formData = new FormData();
    formData.append('audio', file);
    const { data } = await api.post('/meetings/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  async toggleTranscriptInsight(meetingId, transcriptIndex) {
    if (USE_MOCK) {
      await delay(100);
      return mockMeetings.toggleTranscriptInsight(meetingId, transcriptIndex);
    }
    const { data } = await api.post(`/meetings/${meetingId}/transcript/${transcriptIndex}/insight`);
    return data;
  },

  async deleteMeeting(id) {
    if (USE_MOCK) {
      await delay(200);
      return mockMeetings.deleteMeeting(id);
    }
    const { data } = await api.delete(`/meetings/${id}`);
    return data;
  },
};
