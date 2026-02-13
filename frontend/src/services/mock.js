/* ============================================================
   Mock Backend — simulates API responses in localStorage
   Remove this file when the real backend is connected.
   ============================================================ */

const MOCK_DB_KEY = 'ps1_mock_db';

function getDB() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_DB_KEY)) || { users: [], posts: [] };
  } catch {
    return { users: [], posts: [] };
  }
}

function saveDB(db) {
  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generateToken(userId) {
  // Fake JWT-like token for mock purposes
  return 'mock_' + btoa(JSON.stringify({ id: userId, exp: Date.now() + 86400000 }));
}

export const mockAuth = {
  signup({ name, email, password, orgCode, role }) {
    const db = getDB();
    const existing = db.users.find((u) => u.email === email);
    if (existing) {
      throw { response: { data: { message: 'Email already registered' } } };
    }
    const user = {
      _id: generateId(),
      name,
      email,
      orgCode,
      role: role || 'member',
      jobTitle: '',
      sex: '',
      createdAt: new Date().toISOString(),
    };
    db.users.push({ ...user, password });
    saveDB(db);
    const token = generateToken(user._id);
    return { token, user };
  },

  login({ email, password }) {
    const db = getDB();
    const found = db.users.find((u) => u.email === email && u.password === password);
    if (!found) {
      throw { response: { data: { message: 'Invalid email or password' } } };
    }
    const { password: _, ...user } = found;
    const token = generateToken(user._id);
    return { token, user };
  },

  getMe(token) {
    try {
      const payload = JSON.parse(atob(token.replace('mock_', '')));
      const db = getDB();
      const found = db.users.find((u) => u._id === payload.id);
      if (!found) throw new Error('Not found');
      const { password: _, ...user } = found;
      return { user };
    } catch {
      throw { response: { status: 401, data: { message: 'Invalid token' } } };
    }
  },

  updateProfile(token, updates) {
    const payload = JSON.parse(atob(token.replace('mock_', '')));
    const db = getDB();
    const idx = db.users.findIndex((u) => u._id === payload.id);
    if (idx === -1) throw { response: { data: { message: 'User not found' } } };
    db.users[idx] = { ...db.users[idx], ...updates };
    saveDB(db);
    const { password: _, ...user } = db.users[idx];
    return { user };
  },
};
