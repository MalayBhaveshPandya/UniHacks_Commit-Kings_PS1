import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow, format, isValid } from 'date-fns';
import {
  Hash,
  User,
  Send,
  Sparkles,
  Lightbulb,
  MessageSquare,
  ChevronDown,
  Check,
  ArrowLeft,
  Plus,
  X,
  Info,
  LogOut,
  Trash2,
  UserPlus,
  UserMinus,
  Edit3,
  Users,
  Shield,
  Crown,
  Eye,
  Bot,
  BookOpen,
  Star,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/chat.service';
import { aiService } from '../services/ai.service';
import Avatar from '../components/shared/Avatar';
import Button from '../components/shared/Button';
import AnonymousToggle from '../components/shared/AnonymousToggle';
import EmptyState from '../components/shared/EmptyState';
import { Loader } from '../components/shared/Loader';
import styles from './Chat.module.css';

/**
 * Simple markdown-to-HTML renderer for AI feedback.
 */
function renderFeedbackText(text) {
  if (!text) return '';
  let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const lines = html.split('\n');
  let inList = false;
  let result = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      if (!inList) { result += '<ul>'; inList = true; }
      result += `<li>${trimmed.substring(2)}</li>`;
    } else {
      if (inList) { result += '</ul>'; inList = false; }
      if (trimmed) {
        result += `<p>${trimmed}</p>`;
      }
    }
  }
  if (inList) result += '</ul>';
  return result;
}

const AI_PERSONAS = [
  { key: 'investor', label: 'Investor', icon: '💰' },
  { key: 'critical', label: 'Critical', icon: '🔍' },
  { key: 'optimist', label: 'Optimist', icon: '🌟' },
  { key: 'team_lead', label: 'Team Lead', icon: '👥' },
];

export default function ChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Message input state
  const [text, setText] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [sending, setSending] = useState(false);

  // AI Insights state
  const [aiDropdownOpen, setAIDropdownOpen] = useState(false);
  const [selectedPersonas, setSelectedPersonas] = useState([]);

  // Group management state
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [orgUsers, setOrgUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [groupDetails, setGroupDetails] = useState(null);

  // Create group form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Edit group
  const [editingGroup, setEditingGroup] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // ---- INSIGHTS & SUMMARIZE STATE ----
  const [showInsightsPanel, setShowInsightsPanel] = useState(false);
  const [insightMessages, setInsightMessages] = useState([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const [showSummarizePanel, setShowSummarizePanel] = useState(false);
  const [chatSummary, setChatSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryQuestion, setSummaryQuestion] = useState('');
  const [summaryQA, setSummaryQA] = useState([]); // { question, answer }[]
  const [askingQuestion, setAskingQuestion] = useState(false);

  // Reviewer management
  const [showReviewerModal, setShowReviewerModal] = useState(false);
  const [selectedReviewers, setSelectedReviewers] = useState([]);

  const msgEndRef = useRef(null);
  const inputRef = useRef(null);
  const aiDropdownRef = useRef(null);

  const activeConv = conversations.find((c) => c._id === activeConvId);
  const isTeamChannel = activeConv?.type === 'team';

  // Check if current user can mark insights (admins, reviewers, or certain roles)
  const canMarkInsight = (() => {
    if (['ceo', 'reviewer', 'team_lead', 'Admin', 'Reviewer'].includes(user?.role)) return true;
    if (groupDetails?.reviewers?.some?.((r) => (r._id || r) === user?._id)) return true;
    if (groupDetails?.admins?.some?.((a) => (a._id || a) === user?._id)) return true;
    return false;
  })();

  // Close AI dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (aiDropdownRef.current && !aiDropdownRef.current.contains(e.target)) {
        setAIDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Load conversations
  useEffect(() => {
    const load = async () => {
      setLoadingConvs(true);
      try {
        const data = await chatService.getConversations();
        setConversations(data.conversations);
        if (data.conversations.length > 0 && !activeConvId) {
          setActiveConvId(data.conversations[0]._id);
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
      } finally {
        setLoadingConvs(false);
      }
    };
    load();
  }, []);

  // Load messages when activeConvId changes
  useEffect(() => {
    if (!activeConvId) return;
    const load = async () => {
      setLoadingMsgs(true);
      try {
        const data = await chatService.getMessages(activeConvId);
        setMessages(data.messages);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoadingMsgs(false);
      }
    };
    load();
    setSelectedPersonas([]);
    setShowGroupInfo(false);
    setShowInsightsPanel(false);
    setShowSummarizePanel(false);
    setChatSummary('');
    setSummaryQA([]);
    setGroupDetails(null);
  }, [activeConvId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation details (including reviewers) when group info opens or on active change for team channels
  useEffect(() => {
    if (!activeConvId || !isTeamChannel) return;
    const loadDetails = async () => {
      try {
        const data = await chatService.getConversationDetails(activeConvId);
        setGroupDetails(data.conversation);
      } catch (err) {
        console.error('Failed to load group details:', err);
      }
    };
    loadDetails();
  }, [activeConvId, isTeamChannel]);

  // ---- Load org users (for group creation / add members) ----
  const loadOrgUsers = async () => {
    if (orgUsers.length > 0) return; // Cache
    setLoadingUsers(true);
    try {
      const data = await chatService.getOrgUsers();
      setOrgUsers(data.users);
    } catch (err) {
      console.error('Failed to load org users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // ---- Group Info ----
  const openGroupInfo = async () => {
    setShowGroupInfo(true);
    try {
      const data = await chatService.getConversationDetails(activeConvId);
      setGroupDetails(data.conversation);
    } catch (err) {
      console.error('Failed to load group details:', err);
    }
  };

  // ---- Create Group ----
  const openCreateGroup = () => {
    setShowCreateGroup(true);
    setNewGroupName('');
    setNewGroupDesc('');
    setSelectedMembers([]);
    loadOrgUsers();
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      const { conversation } = await chatService.createConversation({
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        type: 'team',
        participantIds: selectedMembers,
      });
      setConversations((prev) => [conversation, ...prev]);
      setActiveConvId(conversation._id);
      setShowCreateGroup(false);
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setCreatingGroup(false);
    }
  };

  // ---- Edit Group ----
  const startEditGroup = () => {
    setEditingGroup(true);
    setEditName(groupDetails?.name || '');
    setEditDesc(groupDetails?.description || '');
  };

  const saveEditGroup = async () => {
    try {
      const { conversation } = await chatService.updateConversation(activeConvId, {
        name: editName.trim(),
        description: editDesc.trim(),
      });
      setGroupDetails(conversation);
      setConversations((prev) =>
        prev.map((c) => (c._id === activeConvId ? { ...c, name: conversation.name } : c))
      );
      setEditingGroup(false);
    } catch (err) {
      console.error('Failed to update group:', err);
      alert(err.response?.data?.message || 'Failed to update group');
    }
  };

  // ---- Leave Group ----
  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      await chatService.leaveConversation(activeConvId);
      setConversations((prev) => prev.filter((c) => c._id !== activeConvId));
      setActiveConvId(null);
      setShowGroupInfo(false);
    } catch (err) {
      console.error('Failed to leave group:', err);
    }
  };

  // ---- Delete Group ----
  const handleDeleteGroup = async () => {
    if (!window.confirm('Are you sure you want to delete this group? All messages will be lost.')) return;
    try {
      await chatService.deleteConversation(activeConvId);
      setConversations((prev) => prev.filter((c) => c._id !== activeConvId));
      setActiveConvId(null);
      setShowGroupInfo(false);
    } catch (err) {
      console.error('Failed to delete group:', err);
      alert(err.response?.data?.message || 'Failed to delete group');
    }
  };

  // ---- Add Members ----
  const openAddMembers = () => {
    setShowAddMembers(true);
    setSelectedMembers([]);
    loadOrgUsers();
  };

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) return;
    try {
      const { conversation } = await chatService.addParticipants(activeConvId, selectedMembers);
      setGroupDetails(conversation);
      setShowAddMembers(false);
      setSelectedMembers([]);
    } catch (err) {
      console.error('Failed to add members:', err);
      alert(err.response?.data?.message || 'Failed to add members');
    }
  };

  // ---- Remove Member ----
  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member from the group?')) return;
    try {
      const { conversation } = await chatService.removeParticipant(activeConvId, userId);
      setGroupDetails(conversation);
    } catch (err) {
      console.error('Failed to remove member:', err);
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  // ---- Send Message (with AI) ----
  const handleSend = async () => {
    if (!text.trim() || !activeConvId) return;
    const messageText = text.trim();
    const personasToUse = isTeamChannel ? [...selectedPersonas] : [];
    setSending(true);
    try {
      const { message } = await chatService.sendMessage(activeConvId, {
        text: messageText,
        anonymous: isTeamChannel ? anonymous : false,
      });
      setMessages((prev) => [...prev, message]);
      setText('');
      setAnonymous(false);

      setConversations((prev) =>
        prev.map((c) =>
          c._id === activeConvId
            ? { ...c, lastMessage: { text: message.text, createdAt: message.createdAt } }
            : c
        )
      );

      if (personasToUse.length > 0) {
        const thinkingId = `ai-thinking-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            _id: thinkingId,
            text: '✨ AI is analyzing your message...',
            createdAt: new Date().toISOString(),
            author: { _id: 'ai-assistant', name: 'AI Advisor' },
            isAI: true,
            isAILoading: true,
          },
        ]);

        try {
          const data = await aiService.getFeedback({ text: messageText, personas: personasToUse });
          if (data.feedbacks && data.feedbacks.length > 0) {
            const aiMessages = data.feedbacks.map((fb, idx) => {
              const persona = AI_PERSONAS.find((p) => p.key === fb.persona);
              return {
                _id: `ai-${Date.now()}-${idx}`,
                text: fb.feedback,
                createdAt: new Date().toISOString(),
                author: { _id: 'ai-assistant', name: `AI · ${persona?.icon || '✨'} ${persona?.label || fb.persona}` },
                isAI: true,
                personaKey: fb.persona,
              };
            });
            setMessages((prev) => [...prev.filter((m) => m._id !== thinkingId), ...aiMessages]);
          } else {
            setMessages((prev) => prev.filter((m) => m._id !== thinkingId));
          }
        } catch (err) {
          console.error('AI insight failed:', err);
          setMessages((prev) =>
            prev.map((m) =>
              m._id === thinkingId
                ? { ...m, text: '⚠️ Could not generate AI feedback. Please try again.', isAILoading: false }
                : m
            )
          );
        }
        setSelectedPersonas([]);
      }
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setSending(false);
    }
  };

  const togglePersona = (key) => {
    setSelectedPersonas((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const selectAllPersonas = () => {
    if (selectedPersonas.length === AI_PERSONAS.length) {
      setSelectedPersonas([]);
    } else {
      setSelectedPersonas(AI_PERSONAS.map((p) => p.key));
    }
  };

  const handleMarkInsight = async (messageId) => {
    try {
      const { message } = await chatService.markMessageInsight(activeConvId, messageId);
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? message : m))
      );
    } catch (err) {
      console.error('Failed to mark insight:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Helpers
  const isGroupAdmin = (convDetails) => {
    return (
      convDetails?.admins?.some((a) => (a._id || a) === user?._id) ||
      convDetails?.createdBy?._id === user?._id ||
      convDetails?.createdBy === user?._id
    );
  };

  // ---- INSIGHTS ----
  const openInsightsPanel = async () => {
    setShowInsightsPanel(true);
    setShowSummarizePanel(false);
    setLoadingInsights(true);
    try {
      const data = await chatService.getInsights(activeConvId);
      setInsightMessages(data.insights || []);
    } catch (err) {
      console.error('Failed to load insights:', err);
      setInsightMessages([]);
    } finally {
      setLoadingInsights(false);
    }
  };

  // ---- AI SUMMARIZE ----
  const openSummarizePanel = async () => {
    setShowSummarizePanel(true);
    setShowInsightsPanel(false);
    if (chatSummary) return; // Already have a summary
    setLoadingSummary(true);
    try {
      const data = await chatService.summarizeChat(activeConvId);
      setChatSummary(data.summary || 'No summary available.');
    } catch (err) {
      console.error('Failed to summarize chat:', err);
      setChatSummary('⚠️ Failed to generate summary. Please try again.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!summaryQuestion.trim()) return;
    const q = summaryQuestion.trim();
    setSummaryQuestion('');
    setAskingQuestion(true);
    setSummaryQA((prev) => [...prev, { question: q, answer: null }]);
    try {
      const data = await chatService.summarizeChat(activeConvId, q);
      setSummaryQA((prev) =>
        prev.map((item, idx) =>
          idx === prev.length - 1 ? { ...item, answer: data.summary } : item
        )
      );
    } catch (err) {
      console.error('Failed to answer question:', err);
      setSummaryQA((prev) =>
        prev.map((item, idx) =>
          idx === prev.length - 1 ? { ...item, answer: '⚠️ Failed to get an answer. Try again.' } : item
        )
      );
    } finally {
      setAskingQuestion(false);
    }
  };

  // ---- REVIEWER MANAGEMENT ----
  const openReviewerModal = () => {
    setShowReviewerModal(true);
    setSelectedReviewers(
      groupDetails?.reviewers?.map((r) => r._id || r) || []
    );
    loadOrgUsers();
  };

  const toggleReviewer = (userId) => {
    setSelectedReviewers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSaveReviewers = async () => {
    try {
      const { conversation } = await chatService.manageReviewers(activeConvId, selectedReviewers);
      setGroupDetails(conversation);
      setShowReviewerModal(false);
    } catch (err) {
      console.error('Failed to update reviewers:', err);
      alert(err.response?.data?.message || 'Failed to update reviewers');
    }
  };

  // Filter conversations
  const filteredConvs = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const teamChannels = filteredConvs.filter((c) => c.type === 'team');
  const dms = filteredConvs.filter((c) => c.type === 'dm');

  return (
    <div className={`${styles['chat-layout']} ${activeConvId ? 'show-chat' : ''}`}>
      {/* ---- Left Panel: Conversations ---- */}
      <div className={styles['conv-panel']}>
        <div className={styles['conv-header']}>
          <h2>Messages</h2>
          <button className={styles['create-group-btn']} onClick={openCreateGroup} title="Create Group">
            <Plus size={18} />
          </button>
        </div>

        <div className={styles['conv-search']}>
          <input
            className={styles['conv-search-input']}
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles['conv-list']}>
          {loadingConvs ? (
            <div style={{ padding: 'var(--space-6)' }}>
              <Loader text="Loading..." />
            </div>
          ) : (
            <>
              {teamChannels.length > 0 && (
                <>
                  <div className={styles['conv-section-label']}>Channels</div>
                  {teamChannels.map((c) => (
                    <ConvItem
                      key={c._id}
                      conv={c}
                      active={c._id === activeConvId}
                      onClick={() => setActiveConvId(c._id)}
                    />
                  ))}
                </>
              )}
              {dms.length > 0 && (
                <>
                  <div className={styles['conv-section-label']}>Direct Messages</div>
                  {dms.map((c) => (
                    <ConvItem
                      key={c._id}
                      conv={c}
                      active={c._id === activeConvId}
                      onClick={() => setActiveConvId(c._id)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ---- Right Panel: Messages ---- */}
      <div className={styles['msg-panel']}>
        {activeConv ? (
          <>
            {/* Header */}
            <div className={styles['msg-header']}>
              <div className={styles['msg-header-info']}>
                <button
                  className={styles['msg-back-btn']}
                  onClick={() => setActiveConvId(null)}
                >
                  <ArrowLeft size={20} />
                </button>
                <div
                  className={`${styles['conv-icon']} ${isTeamChannel ? styles['conv-icon--clickable'] : ''}`}
                  onClick={isTeamChannel ? openGroupInfo : undefined}
                  title={isTeamChannel ? 'View Group Info' : undefined}
                >
                  {activeConv.type === 'team' ? <Hash size={16} /> : <User size={16} />}
                </div>
                <div
                  className={isTeamChannel ? styles['header-clickable'] : ''}
                  onClick={isTeamChannel ? openGroupInfo : undefined}
                >
                  <h3>{activeConv.name}</h3>
                  <span>
                    {activeConv.type === 'team'
                      ? `${activeConv.participants?.length || 0} members`
                      : 'Direct Message'}
                  </span>
                </div>
              </div>
              <div className={styles['msg-header-actions']}>
                {isTeamChannel && (
                  <>
                    <button
                      className={`${styles['header-action-btn']} ${showInsightsPanel ? styles['header-action-btn--active'] : ''}`}
                      onClick={openInsightsPanel}
                      title="Chat Insights"
                    >
                      <Lightbulb size={16} />
                      <span className={styles['header-action-label']}>Insights</span>
                    </button>
                    <button
                      className={`${styles['header-action-btn']} ${showSummarizePanel ? styles['header-action-btn--active'] : ''}`}
                      onClick={openSummarizePanel}
                      title="AI Summarize"
                    >
                      <Bot size={16} />
                      <span className={styles['header-action-label']}>Summarize</span>
                    </button>
                  </>
                )}
                {isTeamChannel && (
                  <button
                    className={styles['header-info-btn']}
                    onClick={openGroupInfo}
                    title="Group Info"
                  >
                    <Info size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* ---- Insights / Summarize Overlay Panels ---- */}
            {showInsightsPanel && (
              <div className={styles['insights-panel']}>
                <div className={styles['insights-panel-header']}>
                  <div className={styles['insights-panel-title']}>
                    <Lightbulb size={16} />
                    <span>Chat Insights</span>
                    <span className={styles['insights-count']}>{insightMessages.length}</span>
                  </div>
                  <button onClick={() => setShowInsightsPanel(false)} className={styles['insights-close']}>
                    <X size={16} />
                  </button>
                </div>
                <div className={styles['insights-panel-body']}>
                  {loadingInsights ? (
                    <div style={{ padding: 'var(--space-6)' }}>
                      <Loader text="Loading insights..." />
                    </div>
                  ) : insightMessages.length === 0 ? (
                    <div className={styles['insights-empty']}>
                      <Star size={32} />
                      <p>No insights yet</p>
                      <span>Reviewers can mark important messages as insights to highlight them here.</span>
                    </div>
                  ) : (
                    insightMessages.map((msg) => (
                      <div key={msg._id} className={styles['insight-card']}>
                        <div className={styles['insight-card-header']}>
                          <Avatar name={msg.anonymous ? null : msg.author?.name} anonymous={msg.anonymous} size="xs" />
                          <span className={styles['insight-card-author']}>
                            {msg.anonymous ? 'Anonymous' : msg.author?.name || 'Unknown'}
                          </span>
                          <span className={styles['insight-card-time']}>
                            {(() => {
                              const d = new Date(msg.createdAt);
                              return isValid(d) ? format(d, 'MMM d, h:mm a') : '';
                            })()}
                          </span>
                        </div>
                        <p className={styles['insight-card-text']}>{msg.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {showSummarizePanel && (
              <div className={styles['summarize-panel']}>
                <div className={styles['summarize-panel-header']}>
                  <div className={styles['summarize-panel-title']}>
                    <Bot size={16} />
                    <span>AI Chat Summary</span>
                  </div>
                  <button onClick={() => setShowSummarizePanel(false)} className={styles['insights-close']}>
                    <X size={16} />
                  </button>
                </div>
                <div className={styles['summarize-panel-body']}>
                  {loadingSummary ? (
                    <div className={styles['summarize-loading']}>
                      <div className={styles['ai-thinking']}>
                        <span className={styles['ai-thinking-dot']} />
                        <span className={styles['ai-thinking-dot']} />
                        <span className={styles['ai-thinking-dot']} />
                        <span style={{ marginLeft: '8px' }}>AI is summarizing...</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={styles['summary-content']}>
                        <div dangerouslySetInnerHTML={{ __html: renderFeedbackText(chatSummary) }} />
                      </div>

                      {/* Q&A Section */}
                      {summaryQA.length > 0 && (
                        <div className={styles['summary-qa']}>
                          {summaryQA.map((item, idx) => (
                            <div key={idx} className={styles['qa-item']}>
                              <div className={styles['qa-question']}>
                                <Search size={12} />
                                <span>{item.question}</span>
                              </div>
                              {item.answer ? (
                                <div className={styles['qa-answer']}>
                                  <div dangerouslySetInnerHTML={{ __html: renderFeedbackText(item.answer) }} />
                                </div>
                              ) : (
                                <div className={styles['qa-loading']}>
                                  <span className={styles['ai-thinking-dot']} />
                                  <span className={styles['ai-thinking-dot']} />
                                  <span className={styles['ai-thinking-dot']} />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className={styles['summary-ask']}>
                        <input
                          className={styles['summary-ask-input']}
                          placeholder="Ask a question about this chat..."
                          value={summaryQuestion}
                          onChange={(e) => setSummaryQuestion(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAskQuestion();
                            }
                          }}
                          disabled={askingQuestion}
                        />
                        <button
                          className={styles['summary-ask-btn']}
                          onClick={handleAskQuestion}
                          disabled={!summaryQuestion.trim() || askingQuestion}
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            {!showInsightsPanel && !showSummarizePanel && (
              <div className={styles['msg-body']}>
                {loadingMsgs ? (
                  <Loader text="Loading messages..." />
                ) : messages.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="No messages yet"
                    description="Start the conversation!"
                  />
                ) : (
                  messages.map((msg) => {
                    const isAI = msg.isAI;
                    const isMine = !isAI && !msg.anonymous && msg.author?._id === user?._id;
                    return (
                      <div
                        key={msg._id}
                        className={`${styles.message} ${isAI ? styles['message--ai'] : isMine ? styles['message--mine'] : styles['message--other']} ${msg.anonymous ? styles['message--anon'] : ''}`}
                      >
                        {!isMine && (
                          isAI ? (
                            <div className={styles['ai-avatar']}>
                              <Sparkles size={16} />
                            </div>
                          ) : (
                            <Avatar
                              name={msg.anonymous ? null : msg.author?.name}
                              anonymous={msg.anonymous}
                              size="sm"
                            />
                          )
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {!isMine && (
                            <div className={`${styles['message-author']} ${isAI ? styles['message-author--ai'] : ''}`}>
                              {isAI ? msg.author?.name : msg.anonymous ? 'Anonymous' : msg.author?.name || 'Unknown'}
                            </div>
                          )}
                          <div className={`${styles['message-bubble']} ${isAI ? styles['message-bubble--ai'] : ''}`}>
                            {isAI ? (
                              msg.isAILoading ? (
                                <div className={styles['ai-thinking']}>
                                  <span className={styles['ai-thinking-dot']} />
                                  <span className={styles['ai-thinking-dot']} />
                                  <span className={styles['ai-thinking-dot']} />
                                  <span style={{ marginLeft: '8px' }}>{msg.text}</span>
                                </div>
                              ) : (
                                <div dangerouslySetInnerHTML={{ __html: renderFeedbackText(msg.text) }} />
                              )
                            ) : (
                              msg.text
                            )}
                            {msg.isInsight && (
                              <div className={styles['insight-indicator']} title="Marked as Insight">
                                <Lightbulb size={12} color="var(--accent-primary)" fill="var(--accent-primary)" />
                                <span>Insight</span>
                              </div>
                            )}
                          </div>
                          <div className={styles['message-time']}>
                            {(() => {
                              const d = new Date(msg.createdAt);
                              return isValid(d) ? format(d, 'h:mm a') : '';
                            })()}
                          </div>
                        </div>

                        {canMarkInsight && !isMine && !isAI && (
                          <div className={styles['message-actions']}>
                            <button
                              className={`${styles['msg-action-btn']} ${msg.isInsight ? styles['msg-action-btn--active'] : ''}`}
                              onClick={() => handleMarkInsight(msg._id)}
                              title={msg.isInsight ? 'Remove Insight' : 'Mark as Insight'}
                            >
                              <Lightbulb size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={msgEndRef} />
              </div>
            )}

            {/* Input */}
            <div className={styles['msg-input-area']}>
              <div className={styles['msg-input-row']}>
                <textarea
                  ref={inputRef}
                  className={styles['msg-input']}
                  placeholder={`Message ${activeConv.name}...`}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <Button onClick={handleSend} loading={sending} disabled={!text.trim()} icon={Send} size="sm">
                  Send
                </Button>
              </div>

              {isTeamChannel && (
                <div className={styles['msg-input-controls']}>
                  <AnonymousToggle active={anonymous} onChange={setAnonymous} label="Send Anonymously" />

                  <div ref={aiDropdownRef} style={{ position: 'relative' }}>
                    <button
                      className={styles['ai-trigger']}
                      onClick={() => setAIDropdownOpen(!aiDropdownOpen)}
                    >
                      <Sparkles size={12} />
                      AI Insights
                      {selectedPersonas.length > 0 && (
                        <span className={styles['ai-trigger-badge']}>{selectedPersonas.length}</span>
                      )}
                      <ChevronDown size={12} />
                    </button>

                    {aiDropdownOpen && (
                      <div className={styles['ai-dropdown']}>
                        <div className={styles['ai-dropdown-header']}>
                          <span>Select Personas</span>
                          <button className={styles['ai-dropdown-select-all']} onClick={selectAllPersonas}>
                            {selectedPersonas.length === AI_PERSONAS.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        {AI_PERSONAS.map((p) => {
                          const isSelected = selectedPersonas.includes(p.key);
                          return (
                            <button
                              key={p.key}
                              className={`${styles['ai-dropdown-item']} ${isSelected ? styles['ai-dropdown-item--selected'] : ''}`}
                              onClick={() => togglePersona(p.key)}
                            >
                              <span className={styles['ai-dropdown-check']}>
                                {isSelected && <Check size={12} />}
                              </span>
                              <span>{p.icon}</span>
                              <span>{p.label}</span>
                            </button>
                          );
                        })}
                        <div className={styles['ai-dropdown-note']}>
                          <Sparkles size={10} />
                          Selected personas will reply when you send
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={styles['empty-chat']}>
            <EmptyState
              icon={MessageSquare}
              title="Select a conversation"
              description="Choose a channel or DM from the sidebar to start chatting."
            />
          </div>
        )}
      </div>

      {/* ======== CREATE GROUP MODAL ======== */}
      {showCreateGroup && (
        <div className={styles['modal-overlay']} onClick={() => setShowCreateGroup(false)}>
          <div className={styles['modal']} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h3><Users size={18} /> Create New Group</h3>
              <button onClick={() => setShowCreateGroup(false)} className={styles['modal-close']}>
                <X size={18} />
              </button>
            </div>

            <div className={styles['modal-body']}>
              <label className={styles['modal-label']}>Group Name *</label>
              <input
                className={styles['modal-input']}
                placeholder="e.g., Product Team, Sprint 5..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                autoFocus
              />

              <label className={styles['modal-label']}>Description</label>
              <textarea
                className={styles['modal-textarea']}
                placeholder="What's this group about?"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                rows={2}
              />

              <label className={styles['modal-label']}>
                Add Members ({selectedMembers.length} selected)
              </label>
              <div className={styles['member-picker']}>
                {loadingUsers ? (
                  <Loader text="Loading users..." />
                ) : (
                  orgUsers
                    .filter((u) => u._id !== user?._id)
                    .map((u) => {
                      const selected = selectedMembers.includes(u._id);
                      return (
                        <button
                          key={u._id}
                          className={`${styles['member-item']} ${selected ? styles['member-item--selected'] : ''}`}
                          onClick={() => toggleMember(u._id)}
                        >
                          <Avatar name={u.name} size="xs" />
                          <div className={styles['member-item-info']}>
                            <span className={styles['member-item-name']}>{u.name}</span>
                            <span className={styles['member-item-role']}>{u.role}</span>
                          </div>
                          <span className={styles['member-item-check']}>
                            {selected && <Check size={14} />}
                          </span>
                        </button>
                      );
                    })
                )}
              </div>
            </div>

            <div className={styles['modal-footer']}>
              <Button onClick={() => setShowCreateGroup(false)} variant="ghost" size="sm">Cancel</Button>
              <Button
                onClick={handleCreateGroup}
                loading={creatingGroup}
                disabled={!newGroupName.trim()}
                icon={Plus}
                size="sm"
              >
                Create Group
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ======== GROUP INFO PANEL ======== */}
      {showGroupInfo && (
        <div className={styles['info-panel-overlay']} onClick={() => setShowGroupInfo(false)}>
          <div className={styles['info-panel']} onClick={(e) => e.stopPropagation()}>
            <div className={styles['info-panel-header']}>
              <h3>Group Info</h3>
              <button onClick={() => setShowGroupInfo(false)} className={styles['modal-close']}>
                <X size={18} />
              </button>
            </div>

            {!groupDetails ? (
              <div style={{ padding: 'var(--space-6)' }}>
                <Loader text="Loading..." />
              </div>
            ) : (
              <div className={styles['info-panel-body']}>
                {/* Group identity */}
                <div className={styles['info-group-header']}>
                  <div className={styles['info-group-icon']}>
                    <Hash size={28} />
                  </div>
                  {editingGroup ? (
                    <div className={styles['info-edit-form']}>
                      <input
                        className={styles['modal-input']}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Group name"
                      />
                      <textarea
                        className={styles['modal-textarea']}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Description"
                        rows={2}
                      />
                      <div className={styles['info-edit-actions']}>
                        <Button onClick={() => setEditingGroup(false)} variant="ghost" size="sm">Cancel</Button>
                        <Button onClick={saveEditGroup} size="sm" icon={Check}>Save</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className={styles['info-group-name']}>{groupDetails.name}</h2>
                      <p className={styles['info-group-desc']}>
                        {groupDetails.description || 'No description'}
                      </p>
                      <p className={styles['info-group-meta']}>
                        Created {groupDetails.createdAt ? format(new Date(groupDetails.createdAt), 'MMM d, yyyy') : ''}
                        {groupDetails.createdBy?.name ? ` by ${groupDetails.createdBy.name}` : ''}
                      </p>
                      {isGroupAdmin(groupDetails) && (
                        <button className={styles['info-edit-btn']} onClick={startEditGroup}>
                          <Edit3 size={14} /> Edit Group
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Reviewers section */}
                <div className={styles['info-section']}>
                  <div className={styles['info-section-header']}>
                    <span><Eye size={14} /> Reviewers · {groupDetails.reviewers?.length || 0}</span>
                    {isGroupAdmin(groupDetails) && (
                      <button className={styles['info-add-btn']} onClick={openReviewerModal}>
                        <Edit3 size={14} /> Manage
                      </button>
                    )}
                  </div>
                  {groupDetails.reviewers?.length > 0 ? (
                    <div className={styles['info-member-list']}>
                      {groupDetails.reviewers.map((reviewer) => {
                        const reviewerId = reviewer._id || reviewer;
                        return (
                          <div key={reviewerId} className={styles['info-member']}>
                            <Avatar name={reviewer.name} size="sm" />
                            <div className={styles['info-member-info']}>
                              <span className={styles['info-member-name']}>
                                {reviewer.name}
                                {reviewerId === user?._id && <span className={styles['info-you-tag']}>You</span>}
                              </span>
                              <span className={styles['info-member-role']}>
                                {reviewer.role || 'Reviewer'}
                                <span className={styles['info-badge']}><Eye size={10} /> Reviewer</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', padding: 'var(--space-2) 0' }}>
                      No reviewers assigned. Admins can assign reviewers who can mark messages as insights.
                    </p>
                  )}
                </div>

                {/* Members section */}
                <div className={styles['info-section']}>
                  <div className={styles['info-section-header']}>
                    <span><Users size={14} /> Members · {groupDetails.participants?.length || 0}</span>
                    {isGroupAdmin(groupDetails) && (
                      <button className={styles['info-add-btn']} onClick={openAddMembers}>
                        <UserPlus size={14} /> Add
                      </button>
                    )}
                  </div>

                  <div className={styles['info-member-list']}>
                    {groupDetails.participants?.map((member) => {
                      const memberId = member._id || member;
                      const isAdmin = groupDetails.admins?.some((a) => (a._id || a) === memberId);
                      const isCreator = (groupDetails.createdBy?._id || groupDetails.createdBy) === memberId;
                      const isMe = memberId === user?._id;
                      const isReviewer = groupDetails.reviewers?.some((r) => (r._id || r) === memberId);

                      return (
                        <div key={memberId} className={styles['info-member']}>
                          <Avatar name={member.name} size="sm" />
                          <div className={styles['info-member-info']}>
                            <span className={styles['info-member-name']}>
                              {member.name} {isMe && <span className={styles['info-you-tag']}>You</span>}
                            </span>
                            <span className={styles['info-member-role']}>
                              {member.role || member.jobTitle || 'Member'}
                              {isCreator && <span className={styles['info-badge']}><Crown size={10} /> Creator</span>}
                              {isAdmin && !isCreator && <span className={styles['info-badge']}><Shield size={10} /> Admin</span>}
                              {isReviewer && <span className={styles['info-badge']}><Eye size={10} /> Reviewer</span>}
                            </span>
                          </div>
                          {isGroupAdmin(groupDetails) && !isMe && (
                            <button
                              className={styles['info-remove-btn']}
                              onClick={() => handleRemoveMember(memberId)}
                              title="Remove member"
                            >
                              <UserMinus size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className={styles['info-actions']}>
                  <button className={styles['info-action-btn']} onClick={handleLeaveGroup}>
                    <LogOut size={16} /> Exit Group
                  </button>
                  {isGroupAdmin(groupDetails) && (
                    <button className={`${styles['info-action-btn']} ${styles['info-action-btn--danger']}`} onClick={handleDeleteGroup}>
                      <Trash2 size={16} /> Delete Group
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======== ADD MEMBERS MODAL ======== */}
      {showAddMembers && (
        <div className={styles['modal-overlay']} onClick={() => setShowAddMembers(false)}>
          <div className={styles['modal']} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h3><UserPlus size={18} /> Add Members</h3>
              <button onClick={() => setShowAddMembers(false)} className={styles['modal-close']}>
                <X size={18} />
              </button>
            </div>

            <div className={styles['modal-body']}>
              <div className={styles['member-picker']}>
                {loadingUsers ? (
                  <Loader text="Loading users..." />
                ) : (
                  orgUsers
                    .filter((u) => {
                      // Exclude already-in-group and self
                      const alreadyIn = groupDetails?.participants?.some((p) => (p._id || p) === u._id);
                      return u._id !== user?._id && !alreadyIn;
                    })
                    .map((u) => {
                      const selected = selectedMembers.includes(u._id);
                      return (
                        <button
                          key={u._id}
                          className={`${styles['member-item']} ${selected ? styles['member-item--selected'] : ''}`}
                          onClick={() => toggleMember(u._id)}
                        >
                          <Avatar name={u.name} size="xs" />
                          <div className={styles['member-item-info']}>
                            <span className={styles['member-item-name']}>{u.name}</span>
                            <span className={styles['member-item-role']}>{u.role}</span>
                          </div>
                          <span className={styles['member-item-check']}>
                            {selected && <Check size={14} />}
                          </span>
                        </button>
                      );
                    })
                )}
                {!loadingUsers && orgUsers.filter((u) => {
                  const alreadyIn = groupDetails?.participants?.some((p) => (p._id || p) === u._id);
                  return u._id !== user?._id && !alreadyIn;
                }).length === 0 && (
                    <p style={{ padding: 'var(--space-4)', color: 'var(--text-tertiary)', textAlign: 'center', fontSize: 'var(--fs-sm)' }}>
                      All organization members are already in this group.
                    </p>
                  )}
              </div>
            </div>

            <div className={styles['modal-footer']}>
              <Button onClick={() => setShowAddMembers(false)} variant="ghost" size="sm">Cancel</Button>
              <Button onClick={handleAddMembers} disabled={selectedMembers.length === 0} icon={UserPlus} size="sm">
                Add ({selectedMembers.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ======== MANAGE REVIEWERS MODAL ======== */}
      {showReviewerModal && (
        <div className={styles['modal-overlay']} onClick={() => setShowReviewerModal(false)}>
          <div className={styles['modal']} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h3><Eye size={18} /> Manage Reviewers</h3>
              <button onClick={() => setShowReviewerModal(false)} className={styles['modal-close']}>
                <X size={18} />
              </button>
            </div>

            <div className={styles['modal-body']}>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }}>
                Reviewers can mark important messages as insights. Select group members to assign as reviewers.
              </p>
              <div className={styles['member-picker']}>
                {groupDetails?.participants?.map((member) => {
                  const memberId = member._id || member;
                  const selected = selectedReviewers.includes(memberId);
                  const isAdmin = groupDetails.admins?.some((a) => (a._id || a) === memberId);
                  return (
                    <button
                      key={memberId}
                      className={`${styles['member-item']} ${selected ? styles['member-item--selected'] : ''}`}
                      onClick={() => toggleReviewer(memberId)}
                    >
                      <Avatar name={member.name} size="xs" />
                      <div className={styles['member-item-info']}>
                        <span className={styles['member-item-name']}>{member.name}</span>
                        <span className={styles['member-item-role']}>
                          {member.role || 'Member'}
                          {isAdmin && ' · Admin'}
                        </span>
                      </div>
                      <span className={styles['member-item-check']}>
                        {selected && <Check size={14} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles['modal-footer']}>
              <Button onClick={() => setShowReviewerModal(false)} variant="ghost" size="sm">Cancel</Button>
              <Button onClick={handleSaveReviewers} icon={Check} size="sm">
                Save Reviewers ({selectedReviewers.length})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Sub-component: Conversation Item ---- */
function ConvItem({ conv, active, onClick }) {
  const lastMsgDate = conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt) : null;
  const timeLabel = lastMsgDate && isValid(lastMsgDate)
    ? formatDistanceToNow(lastMsgDate, { addSuffix: false })
    : '';

  return (
    <div
      className={`${styles['conv-item']} ${active ? styles['conv-item--active'] : ''}`}
      onClick={onClick}
    >
      <div className={styles['conv-icon']}>
        {conv.type === 'team' ? <Hash size={16} /> : <User size={16} />}
      </div>
      <div className={styles['conv-info']}>
        <div className={styles['conv-name']}>{conv.name}</div>
        {conv.lastMessage && (
          <div className={styles['conv-preview']}>{conv.lastMessage.text}</div>
        )}
      </div>
      {timeLabel && <div className={styles['conv-time']}>{timeLabel}</div>}
    </div>
  );
}
