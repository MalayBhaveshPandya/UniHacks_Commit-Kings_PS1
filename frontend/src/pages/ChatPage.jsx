import { useState, useEffect, useRef, useCallback } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Hash,
  User,
  Send,
  Sparkles,
  Lightbulb,
  MessageSquare,
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
  const [showAIPreview, setShowAIPreview] = useState(false);
  const [aiLoading, setAILoading] = useState(false);
  const [aiInsight, setAIInsight] = useState(null);

  const msgEndRef = useRef(null);
  const inputRef = useRef(null);

  const activeConv = conversations.find((c) => c._id === activeConvId);
  const canMarkInsight = ['ceo', 'reviewer', 'team_lead'].includes(user?.role);

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
  }, [activeConvId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !activeConvId) return;
    setSending(true);
    try {
      const { message } = await chatService.sendMessage(activeConvId, {
        text: text.trim(),
        anonymous,
      });
      setMessages((prev) => [...prev, message]);
      setText('');
      setAnonymous(false);
      setShowAIPreview(false);
      setAIInsight(null);

      // Update conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c._id === activeConvId
            ? { ...c, lastMessage: { text: message.text, createdAt: message.createdAt } }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setSending(false);
    }
  };

  const handleAIInsight = async () => {
    if (!text.trim()) return;
    setShowAIPreview(true);
    setAILoading(true);
    try {
      const data = await aiService.getFeedback({ text: text.trim(), personas: ['team_lead'] });
      setAIInsight(data.feedbacks[0]);
    } catch (err) {
      console.error('AI insight failed:', err);
    } finally {
      setAILoading(false);
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

  // Filter conversations
  const filteredConvs = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const teamChannels = filteredConvs.filter((c) => c.type === 'team');
  const dms = filteredConvs.filter((c) => c.type === 'dm');

  return (
    <div className={styles['chat-layout']}>
      {/* ---- Left Panel: Conversations ---- */}
      <div className={styles['conv-panel']}>
        <div className={styles['conv-header']}>
          <h2>Messages</h2>
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
                <div className={styles['conv-icon']}>
                  {activeConv.type === 'team' ? <Hash size={16} /> : <User size={16} />}
                </div>
                <div>
                  <h3>{activeConv.name}</h3>
                  <span>{activeConv.type === 'team' ? 'Team Channel' : 'Direct Message'}</span>
                </div>
              </div>
            </div>

            {/* Messages */}
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
                  const isMine = !msg.anonymous && msg.author?._id === user?._id;
                  return (
                    <div
                      key={msg._id}
                      className={`${styles.message} ${isMine ? styles['message--mine'] : styles['message--other']} ${msg.anonymous ? styles['message--anon'] : ''}`}
                    >
                      {!isMine && (
                        <Avatar
                          name={msg.anonymous ? null : msg.author?.name}
                          anonymous={msg.anonymous}
                          size="sm"
                        />
                      )}
                      <div>
                        {!isMine && (
                          <div className={styles['message-author']}>
                            {msg.anonymous ? 'Anonymous' : msg.author?.name || 'Unknown'}
                          </div>
                        )}
                        <div className={styles['message-bubble']}>
                          {msg.text}
                          {msg.isInsight && (
                            <span className={styles['message-insight']}>
                              <Lightbulb size={10} />
                            </span>
                          )}
                        </div>
                        <div className={styles['message-time']}>
                          {format(new Date(msg.createdAt), 'h:mm a')}
                        </div>
                      </div>

                      {/* Actions on hover */}
                      {canMarkInsight && !isMine && (
                        <div className={styles['message-actions']}>
                          <button
                            className={styles['msg-action-btn']}
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

            {/* AI Insight preview */}
            {showAIPreview && (
              <div className={styles['ai-preview']} style={{ margin: `0 var(--space-5)` }}>
                <div className={styles['ai-preview-header']}>
                  <Sparkles size={12} />
                  AI Insight Preview
                </div>
                {aiLoading ? (
                  <p className={styles['ai-preview-text']}>Analyzing your message...</p>
                ) : aiInsight ? (
                  <p className={styles['ai-preview-text']}>
                    <strong>{aiInsight.persona}:</strong> {aiInsight.feedback}
                  </p>
                ) : null}
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
              <div className={styles['msg-input-controls']}>
                <AnonymousToggle active={anonymous} onChange={setAnonymous} label="Send Anonymously" />
                <button
                  className={`${styles['msg-action-btn']}`}
                  onClick={handleAIInsight}
                  title="Send with AI Insights"
                  style={{ width: 'auto', padding: '4px 8px', borderRadius: 'var(--radius-full)', fontSize: 'var(--fs-xs)', display: 'flex', alignItems: 'center', gap: '4px', color: showAIPreview ? 'var(--accent-secondary)' : undefined }}
                >
                  <Sparkles size={12} />
                  AI Insights
                </button>
              </div>
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
    </div>
  );
}

/* ---- Sub-component: Conversation Item ---- */
function ConvItem({ conv, active, onClick }) {
  const timeLabel = conv.lastMessage?.createdAt
    ? formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false })
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
