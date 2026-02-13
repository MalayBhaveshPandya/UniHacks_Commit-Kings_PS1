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

function getCurrentUser(token) {
  try {
    const payload = JSON.parse(atob(token.replace('mock_', '')));
    const db = getDB();
    const found = db.users.find((u) => u._id === payload.id);
    if (!found) return null;
    const { password: _, ...user } = found;
    return user;
  } catch {
    return null;
  }
}

// Seed posts for first-time demo
const SEED_POSTS = [
  {
    _id: 'seed_1',
    content: "We just shipped the new onboarding flow and early metrics look promising — 40% faster completion. But I'm worried we cut corners on accessibility. Should we slow down next sprint to audit?",
    type: 'reflection',
    anonymous: false,
    author: { _id: 'seed_user_1', name: 'Arjun Patel', role: 'team_lead' },
    tags: ['engineering', 'accessibility'],
    reactions: { fire: ['u1', 'u2'], insightful: ['u3'], like: ['u4', 'u5', 'u6'] },
    comments: [
      { _id: 'c1', text: 'Agree — let\'s add 2 days next sprint for the audit.', author: { _id: 'u2', name: 'Priya Sharma' }, anonymous: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
      { _id: 'c2', text: 'Accessibility is non-negotiable. Good call raising this.', author: null, anonymous: true, createdAt: new Date(Date.now() - 1800000).toISOString() },
    ],
    isInsight: true,
    aiToggle: true,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    _id: 'seed_2',
    content: "Decision: We're moving from weekly to bi-weekly sprints starting March. The team feels rushed and retro feedback has been consistent about this for 3 sprints. Quality > velocity.",
    type: 'decision',
    anonymous: false,
    author: { _id: 'seed_user_2', name: 'Meera Krishnan', role: 'ceo' },
    tags: ['process', 'team'],
    reactions: { like: ['u1', 'u2', 'u3', 'u4'], insightful: ['u5'] },
    comments: [],
    isInsight: false,
    aiToggle: false,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    _id: 'seed_3',
    content: "I've been thinking about why standups feel draining. Maybe we should try async standups via this platform instead? Everyone posts a quick update in the feed tagged #standup and we only meet live when there's a blocker.",
    type: 'reflection',
    anonymous: true,
    author: null,
    tags: ['process', 'meetings'],
    reactions: { fire: ['u1'], insightful: ['u2', 'u3', 'u4'] },
    comments: [
      { _id: 'c3', text: 'This is exactly what we need. Standups eat 30 min daily for a 5-person team.', author: { _id: 'u3', name: 'Rahul Verma' }, anonymous: false, createdAt: new Date(Date.now() - 10800000).toISOString() },
    ],
    isInsight: false,
    aiToggle: true,
    createdAt: new Date(Date.now() - 28800000).toISOString(),
  },
  {
    _id: 'seed_4',
    content: "Update: Customer interviews this week revealed that our pricing page is the #1 drop-off point. 7 out of 10 users said they couldn't understand the difference between tiers. Redesign incoming.",
    type: 'update',
    anonymous: false,
    author: { _id: 'seed_user_3', name: 'Zara Ali', role: 'member' },
    tags: ['product', 'ux-research'],
    reactions: { insightful: ['u1', 'u2'], repost: ['u3', 'u4', 'u5'] },
    comments: [],
    isInsight: true,
    aiToggle: false,
    createdAt: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    _id: 'seed_5',
    content: "We had an incident at 3 AM — database failover didn't trigger. Root cause: the health check endpoint was returning 200 even when connections were saturated. I've patched it but we need a post-mortem.",
    type: 'update',
    anonymous: false,
    author: { _id: 'seed_user_1', name: 'Arjun Patel', role: 'team_lead' },
    tags: ['engineering', 'incident'],
    reactions: { like: ['u1', 'u2', 'u3'] },
    comments: [
      { _id: 'c4', text: 'Scheduling post-mortem for Thursday 2 PM. Everyone impacted please join.', author: { _id: 'seed_user_2', name: 'Meera Krishnan' }, anonymous: false, createdAt: new Date(Date.now() - 36000000).toISOString() },
    ],
    isInsight: false,
    aiToggle: false,
    createdAt: new Date(Date.now() - 50000000).toISOString(),
  },
];

const SEED_VERSION = 2; // bump this when seed data changes

function ensureSeedPosts(db) {
  if (!db._seeded || db._seedVersion !== SEED_VERSION) {
    // Clear old seed data and re-seed
    db.posts = db.posts.filter((p) => !p._id?.startsWith('seed_'));
    db.posts = [...SEED_POSTS, ...db.posts];
    db._seeded = true;
    db._seedVersion = SEED_VERSION;
    saveDB(db);
  }
  return db;
}

export const mockPosts = {
  getPosts(filters = {}) {
    let db = getDB();
    db = ensureSeedPosts(db);
    let posts = [...db.posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (filters.type) {
      posts = posts.filter((p) => p.type === filters.type);
    }
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      posts = posts.filter((p) => p.content.toLowerCase().includes(kw));
    }
    if (filters.insightsOnly === 'true') {
      posts = posts.filter((p) => p.isInsight);
    }
    if (filters.tags) {
      const filterTags = filters.tags.split(',');
      posts = posts.filter((p) => p.tags?.some((t) => filterTags.includes(t)));
    }

    return { posts, total: posts.length, page: 1 };
  },

  getPost(id) {
    let db = getDB();
    db = ensureSeedPosts(db);
    const post = db.posts.find((p) => p._id === id);
    if (!post) throw { response: { data: { message: 'Post not found' } } };
    return { post };
  },

  createPost(token, { content, type, anonymous, aiToggle, tags }) {
    const user = getCurrentUser(token);
    const db = getDB();
    const post = {
      _id: generateId(),
      content,
      type: type || 'reflection',
      anonymous: !!anonymous,
      author: anonymous ? null : { _id: user?._id, name: user?.name, role: user?.role },
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      reactions: {},
      comments: [],
      isInsight: false,
      aiToggle: !!aiToggle,
      createdAt: new Date().toISOString(),
    };
    db.posts.unshift(post);
    saveDB(db);
    return { post };
  },

  updatePost(id, updates) {
    const db = getDB();
    const idx = db.posts.findIndex((p) => p._id === id);
    if (idx === -1) throw { response: { data: { message: 'Post not found' } } };
    db.posts[idx] = { ...db.posts[idx], ...updates };
    saveDB(db);
    return { post: db.posts[idx] };
  },

  deletePost(id) {
    const db = getDB();
    db.posts = db.posts.filter((p) => p._id !== id);
    saveDB(db);
    return { success: true };
  },

  reactToPost(token, id, emoji) {
    const user = getCurrentUser(token);
    const db = getDB();
    const post = db.posts.find((p) => p._id === id);
    if (!post) throw { response: { data: { message: 'Post not found' } } };
    if (!post.reactions) post.reactions = {};
    if (!post.reactions[emoji]) post.reactions[emoji] = [];

    const uid = user?._id || 'anon';
    const idx = post.reactions[emoji].indexOf(uid);
    if (idx > -1) {
      post.reactions[emoji].splice(idx, 1);
      if (post.reactions[emoji].length === 0) delete post.reactions[emoji];
    } else {
      post.reactions[emoji].push(uid);
    }
    saveDB(db);
    return { post };
  },

  commentOnPost(token, id, { text, anonymous }) {
    const user = getCurrentUser(token);
    const db = getDB();
    const post = db.posts.find((p) => p._id === id);
    if (!post) throw { response: { data: { message: 'Post not found' } } };
    const comment = {
      _id: generateId(),
      text,
      anonymous: !!anonymous,
      author: anonymous ? null : { _id: user?._id, name: user?.name },
      createdAt: new Date().toISOString(),
    };
    post.comments.push(comment);
    saveDB(db);
    return { comment, post };
  },

  markAsInsight(id) {
    const db = getDB();
    const post = db.posts.find((p) => p._id === id);
    if (!post) throw { response: { data: { message: 'Post not found' } } };
    post.isInsight = !post.isInsight;
    saveDB(db);
    return { post };
  },
};

const AI_FEEDBACK_TEMPLATES = {
  investor: [
    "From a funding perspective, this signals strong product-market awareness. The key question is: what's the TAM impact if you execute on this? Quantify outcomes to build conviction.",
    "Investors look for velocity AND quality. This shows the team is self-correcting, which is a green flag. Document this as part of your operational maturity narrative.",
    "This is the kind of internal signal investors rarely see but always want. It shows the org can identify friction before it becomes a crisis. Keep this loop tight.",
  ],
  critical: [
    "Let's stress-test this: what happens if the assumption is wrong? The team should define a rollback plan and success metrics before committing. Don't let consensus masquerade as validation.",
    "There's a gap between the observation and the proposed action. What data supports this direction over alternatives? Decision quality depends on considering what you might be missing.",
    "A bias toward action is good, but premature optimization kills startups too. Consider running this as a 2-week experiment with clear kill criteria before making it permanent.",
  ],
  optimist: [
    "This is exactly the kind of transparent thinking that builds high-trust teams. The fact that this is being discussed openly is itself a sign of a healthy culture. Keep going! 🚀",
    "Love the proactive framing here. Instead of waiting for problems to compound, the team is surfacing them early. This mindset compounds positively over time.",
    "Really exciting to see this level of self-reflection. Organizations that think this way tend to outperform because they iterate faster on the things that actually matter.",
  ],
  team_lead: [
    "From a team execution standpoint, clarity on priorities is key here. I'd suggest breaking this into actionable items with owners and timelines in the next sync.",
    "Good observation. To operationalize this, consider: who's the DRI? What's the timeline? What does 'done' look like? Making it concrete prevents it from becoming another backlog item.",
    "This resonates with patterns I've seen in high-performing teams. The next step is to turn this insight into a process change — otherwise it stays an observation that fades.",
  ],
};

export const mockAI = {
  getFeedback({ text, personas = ['investor', 'critical', 'optimist', 'team_lead'] }) {
    const feedbacks = personas.map((persona) => {
      const templates = AI_FEEDBACK_TEMPLATES[persona] || AI_FEEDBACK_TEMPLATES.optimist;
      const feedback = templates[Math.floor(Math.random() * templates.length)];
      return { persona, feedback };
    });
    return { feedbacks };
  },
};

/* ============================================================
   Mock Chat
   ============================================================ */

const SEED_CONVERSATIONS = [
  {
    _id: 'conv_general',
    name: 'General',
    type: 'team',
    participants: [],
    lastMessage: { text: 'Welcome to the team channel!', createdAt: new Date(Date.now() - 3600000).toISOString() },
  },
  {
    _id: 'conv_engineering',
    name: 'Engineering',
    type: 'team',
    participants: [],
    lastMessage: { text: 'PR #142 is ready for review.', createdAt: new Date(Date.now() - 7200000).toISOString() },
  },
  {
    _id: 'conv_design',
    name: 'Design',
    type: 'team',
    participants: [],
    lastMessage: { text: 'New mockups uploaded to Figma.', createdAt: new Date(Date.now() - 14400000).toISOString() },
  },
  {
    _id: 'conv_dm_1',
    name: 'Arjun Patel',
    type: 'dm',
    participants: ['seed_user_1'],
    lastMessage: { text: 'Can you review the deploy script?', createdAt: new Date(Date.now() - 1800000).toISOString() },
  },
  {
    _id: 'conv_dm_2',
    name: 'Meera Krishnan',
    type: 'dm',
    participants: ['seed_user_2'],
    lastMessage: { text: 'Board deck looks great 👏', createdAt: new Date(Date.now() - 5400000).toISOString() },
  },
];

const SEED_MESSAGES = {
  conv_general: [
    { _id: 'msg_g1', text: 'Welcome everyone! Use this channel for general discussions.', author: { _id: 'seed_user_2', name: 'Meera Krishnan' }, anonymous: false, isInsight: false, createdAt: new Date(Date.now() - 86400000).toISOString() },
    { _id: 'msg_g2', text: 'Reminder: All-hands meeting tomorrow at 11 AM. Agenda pinned in #engineering.', author: { _id: 'seed_user_1', name: 'Arjun Patel' }, anonymous: false, isInsight: false, createdAt: new Date(Date.now() - 43200000).toISOString() },
    { _id: 'msg_g3', text: 'I think we should reconsider the launch date. The pressure is affecting code quality.', author: null, anonymous: true, isInsight: false, createdAt: new Date(Date.now() - 21600000).toISOString() },
    { _id: 'msg_g4', text: 'Totally agree with the anonymous message above. Quality should come first.', author: { _id: 'seed_user_3', name: 'Zara Ali' }, anonymous: false, isInsight: true, createdAt: new Date(Date.now() - 18000000).toISOString() },
    { _id: 'msg_g5', text: 'Welcome to the team channel!', author: { _id: 'seed_user_2', name: 'Meera Krishnan' }, anonymous: false, isInsight: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  ],
  conv_engineering: [
    { _id: 'msg_e1', text: 'Deployed v2.3.1 to staging. Smoke tests passing.', author: { _id: 'seed_user_1', name: 'Arjun Patel' }, anonymous: false, isInsight: false, createdAt: new Date(Date.now() - 28800000).toISOString() },
    { _id: 'msg_e2', text: 'Found a memory leak in the WebSocket handler — GC not cleaning up listeners. Fix incoming.', author: { _id: 'seed_user_1', name: 'Arjun Patel' }, anonymous: false, isInsight: true, createdAt: new Date(Date.now() - 14400000).toISOString() },
    { _id: 'msg_e3', text: 'PR #142 is ready for review.', author: { _id: 'seed_user_3', name: 'Zara Ali' }, anonymous: false, isInsight: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
  ],
  conv_design: [
    { _id: 'msg_d1', text: 'New mockups uploaded to Figma. Link: figma.com/team/...', author: { _id: 'seed_user_3', name: 'Zara Ali' }, anonymous: false, isInsight: false, createdAt: new Date(Date.now() - 14400000).toISOString() },
  ],
  conv_dm_1: [
    { _id: 'msg_dm1_1', text: 'Hey, can you review the deploy script I pushed?', author: { _id: 'seed_user_1', name: 'Arjun Patel' }, anonymous: false, isInsight: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
    { _id: 'msg_dm1_2', text: 'Can you review the deploy script?', author: { _id: 'seed_user_1', name: 'Arjun Patel' }, anonymous: false, isInsight: false, createdAt: new Date(Date.now() - 1800000).toISOString() },
  ],
  conv_dm_2: [
    { _id: 'msg_dm2_1', text: 'The board deck is almost ready. Can you check slide 7?', author: { _id: 'seed_user_2', name: 'Meera Krishnan' }, anonymous: false, isInsight: false, createdAt: new Date(Date.now() - 10800000).toISOString() },
    { _id: 'msg_dm2_2', text: 'Board deck looks great 👏', author: { _id: 'seed_user_2', name: 'Meera Krishnan' }, anonymous: false, isInsight: false, createdAt: new Date(Date.now() - 5400000).toISOString() },
  ],
};

function ensureSeedChat(db) {
  if (!db._chatSeeded || db._chatSeedVersion !== 1) {
    db.conversations = [...SEED_CONVERSATIONS];
    db.messages = { ...SEED_MESSAGES };
    db._chatSeeded = true;
    db._chatSeedVersion = 1;
    saveDB(db);
  }
  if (!db.conversations) db.conversations = [];
  if (!db.messages) db.messages = {};
  return db;
}

export const mockChat = {
  getConversations() {
    let db = getDB();
    db = ensureSeedChat(db);
    return {
      conversations: db.conversations.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.createdAt || '';
        const bTime = b.lastMessage?.createdAt || b.createdAt || '';
        return new Date(bTime) - new Date(aTime);
      })
    };
  },

  getMessages(conversationId) {
    let db = getDB();
    db = ensureSeedChat(db);
    const messages = db.messages[conversationId] || [];
    return { messages: [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) };
  },

  sendMessage(token, conversationId, { text, anonymous }) {
    const user = getCurrentUser(token);
    const db = getDB();
    if (!db.messages[conversationId]) db.messages[conversationId] = [];
    const msg = {
      _id: generateId(),
      text,
      anonymous: !!anonymous,
      author: anonymous ? null : { _id: user?._id, name: user?.name },
      isInsight: false,
      createdAt: new Date().toISOString(),
    };
    db.messages[conversationId].push(msg);

    // Update lastMessage on conversation
    const conv = db.conversations.find((c) => c._id === conversationId);
    if (conv) {
      conv.lastMessage = { text: msg.text, createdAt: msg.createdAt };
    }
    saveDB(db);
    return { message: msg };
  },

  markMessageInsight(conversationId, messageId) {
    const db = getDB();
    const msgs = db.messages[conversationId] || [];
    const msg = msgs.find((m) => m._id === messageId);
    if (!msg) throw { response: { data: { message: 'Message not found' } } };
    msg.isInsight = !msg.isInsight;
    saveDB(db);
    return { message: msg };
  },

  createConversation(token, { name, type, participantIds }) {
    const user = getCurrentUser(token);
    const db = getDB();
    const conv = {
      _id: generateId(),
      name,
      type: type || 'dm',
      participants: participantIds || [],
      lastMessage: null,
      createdAt: new Date().toISOString(),
    };
    db.conversations.push(conv);
    db.messages[conv._id] = [];
    saveDB(db);
    return { conversation: conv };
  },
};

