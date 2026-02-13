import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Search,
  Plus,
  ChevronDown,
  Clock,
  Calendar,
  Users,
  ExternalLink,
  FileText,
  Lightbulb,
  Video,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { meetingService } from '../services/meeting.service';
import Button from '../components/shared/Button';
import EmptyState from '../components/shared/EmptyState';
import { Loader } from '../components/shared/Loader';
import styles from './Meetings.module.css';

const AVATAR_COLORS = ['#E8927C', '#5B8DEF', '#A478FF', '#3BBF7E', '#F59E44'];

export default function MeetingsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [insightsFilter, setInsightsFilter] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    recordingUrl: '',
    date: '',
    duration: '',
    participants: '',
    tags: '',
  });

  const canMarkInsight = ['ceo', 'reviewer', 'team_lead'].includes(user?.role);

  useEffect(() => {
    fetchMeetings();
  }, [keyword]);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (keyword.trim()) filters.keyword = keyword.trim();
      const data = await meetingService.getMeetings(filters);
      setMeetings(data.meetings);
    } catch (err) {
      console.error('Failed to load meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      const { meeting } = await meetingService.createMeeting(form);
      setMeetings((prev) => [meeting, ...prev]);
      setShowModal(false);
      setForm({ title: '', recordingUrl: '', date: '', duration: '', participants: '', tags: '' });
    } catch (err) {
      console.error('Failed to create meeting:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleInsight = async (meetingId, idx) => {
    try {
      const { meeting } = await meetingService.toggleTranscriptInsight(meetingId, idx);
      setMeetings((prev) => prev.map((m) => (m._id === meetingId ? meeting : m)));
    } catch (err) {
      console.error('Failed to toggle insight:', err);
    }
  };

  return (
    <div className={styles.meetings}>
      {/* Header */}
      <div className={styles.header}>
        <h1>Meetings</h1>
        <div className={styles['search-wrap']}>
          <Search size={16} className={styles['search-icon']} />
          <input
            className={styles.search}
            placeholder="Search meetings & transcripts..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)} size="sm">
          New Meeting
        </Button>
      </div>

      {/* Cards */}
      {loading ? (
        <Loader text="Loading meetings..." />
      ) : meetings.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No meetings yet"
          description="Create a meeting to start recording insights and transcripts."
        />
      ) : (
        <div className={styles.cards}>
          {meetings.map((meeting) => (
            <MeetingCard
              key={meeting._id}
              meeting={meeting}
              expanded={expandedId === meeting._id}
              onToggleExpand={() =>
                setExpandedId(expandedId === meeting._id ? null : meeting._id)
              }
              onToggleInsight={handleToggleInsight}
              insightsFilter={insightsFilter}
              canMarkInsight={canMarkInsight}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className={styles['modal-overlay']} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>New Meeting</h2>
            <div className={styles['form-group']}>
              <label>Title *</label>
              <input
                placeholder="Sprint 15 Planning"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className={styles['form-group']}>
              <label>Recording URL</label>
              <input
                placeholder="https://zoom.us/rec/share/..."
                value={form.recordingUrl}
                onChange={(e) => setForm({ ...form, recordingUrl: e.target.value })}
              />
            </div>
            <div className={styles['form-group']}>
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className={styles['form-group']}>
              <label>Duration</label>
              <input
                placeholder="45 min"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
              />
            </div>
            <div className={styles['form-group']}>
              <label>Participants (comma-separated)</label>
              <input
                placeholder="Alice, Bob, Charlie"
                value={form.participants}
                onChange={(e) => setForm({ ...form, participants: e.target.value })}
              />
            </div>
            <div className={styles['form-group']}>
              <label>Tags (comma-separated)</label>
              <input
                placeholder="retro, engineering"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </div>
            <div className={styles['modal-actions']}>
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} loading={creating} disabled={!form.title.trim()}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------- Meeting Card Sub-component -------- */
function MeetingCard({ meeting, expanded, onToggleExpand, onToggleInsight, insightsFilter, canMarkInsight }) {
  const [showInsightsOnly, setShowInsightsOnly] = useState(false);
  const dateLabel = format(new Date(meeting.date), 'MMM d, yyyy');

  const transcript = showInsightsOnly
    ? meeting.transcript.filter((_, i) => meeting.insights.includes(i))
    : meeting.transcript;

  return (
    <div className={styles.card}>
      {/* Card Header */}
      <div className={styles['card-header']} onClick={onToggleExpand}>
        <div className={styles['card-info']}>
          <div className={styles['card-title']}>
            <Video size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            {meeting.title}
          </div>

          <div className={styles['card-meta']}>
            <span className={styles['card-meta-item']}>
              <Calendar size={12} />
              {dateLabel}
            </span>
            {meeting.duration && (
              <span className={styles['card-meta-item']}>
                <Clock size={12} />
                {meeting.duration}
              </span>
            )}
            <span className={styles['card-meta-item']}>
              <Users size={12} />
              {meeting.participants.length} participants
            </span>
            {meeting.transcript.length > 0 && (
              <span className={styles['card-meta-item']}>
                <FileText size={12} />
                {meeting.transcript.length} lines
              </span>
            )}
            {meeting.insights.length > 0 && (
              <span className={styles['card-meta-item']} style={{ color: 'var(--accent)' }}>
                <Lightbulb size={12} />
                {meeting.insights.length} insights
              </span>
            )}
          </div>

          {meeting.tags?.length > 0 && (
            <div className={styles['card-tags']}>
              {meeting.tags.map((t) => (
                <span key={t} className={styles.tag}>#{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Participants */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className={styles.participants}>
            {meeting.participants.slice(0, 3).map((p, i) => (
              <div
                key={i}
                className={styles['participant-avatar']}
                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                title={p}
              >
                {p.split(' ').map((w) => w[0]).join('').slice(0, 2)}
              </div>
            ))}
            {meeting.participants.length > 3 && (
              <span className={styles['participant-more']}>
                +{meeting.participants.length - 3}
              </span>
            )}
          </div>
          <ChevronDown
            size={16}
            className={`${styles['expand-icon']} ${expanded ? styles['expand-icon--open'] : ''}`}
          />
        </div>
      </div>

      {/* Expanded: Transcript */}
      {expanded && (
        <div className={styles.transcript}>
          <div className={styles['transcript-header']}>
            <div className={styles['transcript-title']}>
              <FileText size={14} />
              Transcript
            </div>
            <div className={styles['transcript-filter']}>
              {meeting.recordingUrl && (
                <a
                  href={meeting.recordingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles['recording-link']}
                >
                  <ExternalLink size={12} />
                  Recording
                </a>
              )}
              {meeting.insights.length > 0 && (
                <button
                  className={`${styles['transcript-filter-btn']} ${showInsightsOnly ? styles['transcript-filter-btn--active'] : ''}`}
                  onClick={() => setShowInsightsOnly(!showInsightsOnly)}
                >
                  <Lightbulb size={10} /> Insights Only
                </button>
              )}
            </div>
          </div>

          {transcript.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: 'var(--space-3)' }}>
              {showInsightsOnly ? 'No insights marked yet.' : 'No transcript available.'}
            </p>
          ) : (
            transcript.map((line, i) => {
              const originalIndex = showInsightsOnly
                ? meeting.transcript.indexOf(line)
                : i;
              const isInsight = meeting.insights.includes(originalIndex);
              return (
                <div
                  key={originalIndex}
                  className={`${styles['t-line']} ${isInsight ? styles['t-line--insight'] : ''}`}
                >
                  <span className={styles['t-time']}>{line.time}</span>
                  <div className={styles['t-content']}>
                    <div className={styles['t-speaker']}>{line.speaker}</div>
                    <div className={styles['t-text']}>{line.text}</div>
                  </div>
                  {canMarkInsight && (
                    <div className={styles['t-actions']}>
                      <button
                        className={`${styles['t-action-btn']} ${isInsight ? styles['t-action-btn--active'] : ''}`}
                        onClick={() => onToggleInsight(meeting._id, originalIndex)}
                        title={isInsight ? 'Remove Insight' : 'Mark as Insight'}
                      >
                        <Lightbulb size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
