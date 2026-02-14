import { useState, useEffect, useRef, useCallback } from 'react';
import { format, isValid } from 'date-fns';
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
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Upload,
  Bot,
  Trash2,
  Play,
  Square,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { meetingService } from '../services/meeting.service';
import Button from '../components/shared/Button';
import EmptyState from '../components/shared/EmptyState';
import { Loader } from '../components/shared/Loader';
import styles from './Meetings.module.css';

const AVATAR_COLORS = ['#E8927C', '#5B8DEF', '#A478FF', '#3BBF7E', '#F59E44'];
const JITSI_DOMAIN = 'meet.jit.si';

// Simple markdown-to-HTML renderer for summaries
function renderMarkdown(text) {
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
      if (trimmed) result += `<p>${trimmed}</p>`;
    }
  }
  if (inList) result += '</ul>';
  return result;
}

export default function MeetingsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Live call state
  const [activeCall, setActiveCall] = useState(null); // meeting object with roomId
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  // Start meeting modal
  const [showStartModal, setShowStartModal] = useState(false);
  const [startTitle, setStartTitle] = useState('');
  const [startingMeeting, setStartingMeeting] = useState(false);

  // Audio transcription state
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [transcriptMeetingId, setTranscriptMeetingId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [manualTranscript, setManualTranscript] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);

  // Form state (for logging a meeting)
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
      setMeetings(data.meetings || []);
    } catch (err) {
      console.error('Failed to load meetings:', err);
      setMeetings([]);
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

  // ---- START LIVE MEETING ----
  const handleStartMeeting = async () => {
    if (!startTitle.trim()) return;
    setStartingMeeting(true);
    try {
      const { meeting } = await meetingService.startMeeting(startTitle.trim());
      setMeetings((prev) => [meeting, ...prev]);
      setActiveCall(meeting);
      setShowStartModal(false);
      setStartTitle('');
    } catch (err) {
      console.error('Failed to start meeting:', err);
    } finally {
      setStartingMeeting(false);
    }
  };

  // Join an existing active meeting
  const handleJoinMeeting = (meeting) => {
    setActiveCall(meeting);
  };

  // ---- JITSI EMBED ----
  useEffect(() => {
    if (!activeCall?.roomId || !jitsiContainerRef.current) return;

    // Clean up previous instance
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }

    // Load Jitsi external API script if not loaded
    const loadJitsi = () => {
      return new Promise((resolve) => {
        if (window.JitsiMeetExternalAPI) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = `https://${JITSI_DOMAIN}/libs/external_api.min.js`;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => {
          console.error('Failed to load Jitsi API');
          resolve();
        };
        document.head.appendChild(script);
      });
    };

    loadJitsi().then(() => {
      if (!window.JitsiMeetExternalAPI || !jitsiContainerRef.current) return;

      try {
        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName: activeCall.roomId,
          parentNode: jitsiContainerRef.current,
          width: '100%',
          height: '100%',
          userInfo: {
            displayName: user?.name || 'User',
            email: user?.email || '',
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            toolbarButtons: [
              'microphone', 'camera', 'desktop', 'chat',
              'raisehand', 'tileview', 'hangup', 'settings',
            ],
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'desktop', 'chat',
              'raisehand', 'tileview', 'hangup', 'settings',
            ],
          },
        });

        api.addEventListener('readyToClose', () => {
          handleEndCall();
        });

        jitsiApiRef.current = api;
      } catch (err) {
        console.error('Jitsi init error:', err);
      }
    });

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [activeCall?.roomId]);

  const handleEndCall = async () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    if (activeCall?._id) {
      try {
        await meetingService.endMeeting(activeCall._id);
        setMeetings((prev) =>
          prev.map((m) => (m._id === activeCall._id ? { ...m, isActive: false } : m))
        );
      } catch (err) {
        console.error('Failed to end meeting:', err);
      }
    }
    setActiveCall(null);
  };

  // ---- AUDIO RECORDING ----
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudio(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      // Start browser speech recognition for live transcript
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalText = '';
        recognition.onresult = (event) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalText += transcript + ' ';
            } else {
              interim = transcript;
            }
          }
          setLiveTranscript(finalText + interim);
          setManualTranscript(finalText);
        };

        recognition.onerror = (e) => console.error('Speech recognition error:', e.error);
        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Microphone access denied. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  // Handle audio file drop/upload
  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setRecordedAudio(file);
      // Auto-transcribe
      setTranscribing(true);
      try {
        const { transcript } = await meetingService.transcribeAudio(file);
        // Convert structured transcript to text format for the textarea
        const text = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
        setManualTranscript(text);
      } catch (err) {
        console.error('Transcription failed:', err);
        alert('Failed to transcribe audio file. Please try again.');
      } finally {
        setTranscribing(false);
      }
    }
  };

  const handleDeleteMeeting = async (id) => {
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;
    try {
      await meetingService.deleteMeeting(id);
      setMeetings((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      console.error('Failed to delete meeting:', err);
    }
  };

  // Save transcript to meeting
  const handleSaveTranscript = async () => {
    if (!transcriptMeetingId || !manualTranscript.trim()) return;
    setTranscribing(true);
    try {
      // Parse transcript into lines
      const lines = manualTranscript.trim().split('\n').filter(Boolean).map((line, i) => {
        // Try to parse "Speaker: Text" if present
        const match = line.match(/^(.*?):\s*(.*)$/);
        const time = `${Math.floor(i * 5 / 60)}:${String(i * 5 % 60).padStart(2, '0')}`;
        if (match) {
          return {
            time,
            speaker: match[1].trim(),
            text: match[2].trim(),
          };
        }
        return {
          time,
          speaker: user?.name || 'Speaker',
          text: line.trim(),
        };
      });

      const { meeting } = await meetingService.updateTranscript(transcriptMeetingId, lines);
      setMeetings((prev) => prev.map((m) => (m._id === transcriptMeetingId ? meeting : m)));
      setShowTranscriptModal(false);
      setManualTranscript('');
      setRecordedAudio(null);
      setLiveTranscript('');
    } catch (err) {
      console.error('Failed to save transcript:', err);
    } finally {
      setTranscribing(false);
    }
  };

  // ---- RENDER: ACTIVE CALL VIEW ----
  if (activeCall) {
    return (
      <div className={styles.meetings}>
        <div className={styles['call-view']}>
          <div className={styles['call-header']}>
            <div className={styles['call-header-info']}>
              <div className={styles['call-live-badge']}>
                <span className={styles['call-live-dot']} />
                LIVE
              </div>
              <h2>{activeCall.title}</h2>
            </div>
            <div className={styles['call-header-actions']}>
              <CopyLinkButton roomId={activeCall.roomId} />
              <button className={styles['call-end-btn']} onClick={handleEndCall}>
                <PhoneOff size={16} />
                End Call
              </button>
            </div>
          </div>
          <div className={styles['call-container']} ref={jitsiContainerRef} />
        </div>
      </div>
    );
  }

  // ---- RENDER: MAIN MEETINGS LIST ----
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
        <div className={styles['header-actions']}>
          <Button
            icon={Phone}
            onClick={() => setShowStartModal(true)}
            size="sm"
            className={styles['start-call-btn']}
          >
            Start Call
          </Button>
          <Button icon={Plus} onClick={() => setShowModal(true)} size="sm" variant="ghost">
            Log Meeting
          </Button>
        </div>
      </div>

      {/* Active meetings banner */}
      {meetings.some((m) => m.isActive) && (
        <div className={styles['active-meetings']}>
          <h3 className={styles['active-meetings-title']}>
            <span className={styles['call-live-dot']} />
            Active Calls
          </h3>
          <div className={styles['active-meetings-list']}>
            {meetings.filter((m) => m.isActive).map((m) => (
              <div key={m._id} className={styles['active-meeting-card']}>
                <div>
                  <span className={styles['active-meeting-title']}>{m.title}</span>
                  <span className={styles['active-meeting-meta']}>
                    {m.participants?.length || 0} participants
                  </span>
                </div>
                <button
                  className={styles['join-call-btn']}
                  onClick={() => handleJoinMeeting(m)}
                >
                  <Video size={14} />
                  Join
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <Loader text="Loading meetings..." />
      ) : meetings.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No meetings yet"
          description="Start a call or log a meeting to get started."
        />
      ) : (
        <div className={styles.cards}>
          {meetings.filter((m) => !m.isActive).map((meeting) => (
            <MeetingCard
              key={meeting._id}
              meeting={meeting}
              expanded={expandedId === meeting._id}
              onToggleExpand={() =>
                setExpandedId(expandedId === meeting._id ? null : meeting._id)
              }
              onToggleInsight={handleToggleInsight}
              canMarkInsight={canMarkInsight}
              onAddTranscript={(id) => {
                setTranscriptMeetingId(id);
                setShowTranscriptModal(true);
                setManualTranscript('');
                setRecordedAudio(null);
                setLiveTranscript('');
              }}
              onSummarize={async (id) => {
                try {
                  const { summary } = await meetingService.summarizeTranscript(id);
                  setMeetings((prev) =>
                    prev.map((m) => (m._id === id ? { ...m, aiSummary: summary } : m))
                  );
                } catch (err) {
                  console.error('Failed to summarize:', err);
                }
              }}
              onDelete={handleDeleteMeeting}
            />
          ))}
        </div>
      )}

      {/* Start Call Modal */}
      {showStartModal && (
        <div className={styles['modal-overlay']} onClick={() => setShowStartModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>
              <Phone size={20} style={{ color: 'var(--accent)', marginRight: '8px' }} />
              Start a Call
            </h2>
            <div className={styles['form-group']}>
              <label>Meeting Title *</label>
              <input
                placeholder="Sprint Planning, Stand-up, etc."
                value={startTitle}
                onChange={(e) => setStartTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartMeeting()}
                autoFocus
              />
            </div>
            <div className={styles['modal-actions']}>
              <Button variant="ghost" onClick={() => setShowStartModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleStartMeeting}
                loading={startingMeeting}
                disabled={!startTitle.trim()}
                icon={Video}
              >
                Start Call
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Log Meeting Modal */}
      {showModal && (
        <div className={styles['modal-overlay']} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Log Meeting</h2>
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

      {/* Audio Transcript Modal */}
      {showTranscriptModal && (
        <div className={styles['modal-overlay']} onClick={() => { setShowTranscriptModal(false); stopRecording(); }}>
          <div className={`${styles.modal} ${styles['transcript-modal']}`} onClick={(e) => e.stopPropagation()}>
            <h2>
              <Mic size={20} style={{ color: 'var(--accent)', marginRight: '8px' }} />
              Add Transcript
            </h2>

            {/* Record Audio */}
            <div className={styles['transcript-section']}>
              <label className={styles['transcript-section-label']}>Record Audio</label>
              <div className={styles['record-controls']}>
                {!isRecording ? (
                  <button className={styles['record-btn']} onClick={startRecording}>
                    <Mic size={16} />
                    Start Recording
                  </button>
                ) : (
                  <button className={`${styles['record-btn']} ${styles['record-btn--active']}`} onClick={stopRecording}>
                    <Square size={14} />
                    Stop Recording
                  </button>
                )}
                {isRecording && (
                  <span className={styles['recording-indicator']}>
                    <span className={styles['recording-dot']} />
                    Recording...
                  </span>
                )}
              </div>

              {/* Live transcript preview */}
              {liveTranscript && (
                <div className={styles['live-transcript']}>
                  <span className={styles['live-transcript-label']}>Live Transcript:</span>
                  <p>{liveTranscript}</p>
                </div>
              )}
            </div>

            {/* Upload Audio */}
            <div className={styles['transcript-section']}>
              <label className={styles['transcript-section-label']}>Or Upload Audio File</label>
              <div className={styles['upload-area']}>
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
                  onChange={handleAudioUpload}
                  id="audio-upload"
                  className={styles['upload-input']}
                />
                <label htmlFor="audio-upload" className={styles['upload-label']}>
                  <Upload size={20} />
                  <span>Drop or click to upload MP3, WAV, M4A...</span>
                </label>
                {recordedAudio && (
                  <div className={styles['uploaded-file']}>
                    <Play size={14} />
                    <span>{recordedAudio.name || 'Recorded audio'}</span>
                    <span className={styles['file-size']}>
                      ({(recordedAudio.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Manual Transcript */}
            <div className={styles['transcript-section']}>
              <label className={styles['transcript-section-label']}>
                Transcript Text
                <span className={styles['transcript-hint']}>(auto-filled from recording, or type/paste)</span>
              </label>
              <textarea
                className={styles['transcript-textarea']}
                rows={8}
                placeholder="Paste or type transcript here... Each line will be a transcript entry."
                value={manualTranscript}
                onChange={(e) => setManualTranscript(e.target.value)}
              />
            </div>

            <div className={styles['modal-actions']}>
              <Button variant="ghost" onClick={() => { setShowTranscriptModal(false); stopRecording(); }}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveTranscript}
                loading={transcribing}
                disabled={!manualTranscript.trim()}
                icon={FileText}
              >
                Save Transcript
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------- Copy Link Button -------- */
function CopyLinkButton({ roomId }) {
  const [copied, setCopied] = useState(false);
  const link = `https://${JITSI_DOMAIN}/${roomId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button className={styles['copy-link-btn']} onClick={handleCopy}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  );
}

/* -------- Meeting Card Sub-component -------- */
function MeetingCard({ meeting, expanded, onToggleExpand, onToggleInsight, canMarkInsight, onAddTranscript, onSummarize, onDelete }) {
  const [showInsightsOnly, setShowInsightsOnly] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  const meetingDate = new Date(meeting.scheduledAt || meeting.date);
  const dateLabel = isValid(meetingDate) ? format(meetingDate, 'MMM d, yyyy') : 'No date';

  const transcriptArr = Array.isArray(meeting.transcript) ? meeting.transcript : [];
  const insightsArr = Array.isArray(meeting.insights) ? meeting.insights : [];

  const transcript = showInsightsOnly
    ? transcriptArr.filter((_, i) => insightsArr.includes(i))
    : transcriptArr;

  const participantsArr = Array.isArray(meeting.participants) ? meeting.participants : [];
  const tagsArr = Array.isArray(meeting.tags) ? meeting.tags : [];

  const handleSummarize = async () => {
    setSummarizing(true);
    await onSummarize(meeting._id);
    setSummarizing(false);
  };

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
              {participantsArr.length} participants
            </span>
            {transcriptArr.length > 0 && (
              <span className={styles['card-meta-item']}>
                <FileText size={12} />
                {transcriptArr.length} lines
              </span>
            )}
            {insightsArr.length > 0 && (
              <span className={styles['card-meta-item']} style={{ color: 'var(--accent)' }}>
                <Lightbulb size={12} />
                {insightsArr.length} insights
              </span>
            )}
          </div>

          {tagsArr.length > 0 && (
            <div className={styles['card-tags']}>
              {tagsArr.map((t) => (
                <span key={t} className={styles.tag}>#{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Participants & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className={styles.participants}>
            {participantsArr.slice(0, 3).map((p, i) => (
              <div
                key={i}
                className={styles['participant-avatar']}
                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                title={typeof p === 'string' ? p : p?.name || ''}
              >
                {(typeof p === 'string' ? p : p?.name || '')
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)}
              </div>
            ))}
            {participantsArr.length > 3 && (
              <span className={styles['participant-more']}>
                +{participantsArr.length - 3}
              </span>
            )}
          </div>

          <button
            className={styles['delete-btn']}
            onClick={(e) => { e.stopPropagation(); onDelete(meeting._id); }}
            title="Delete Meeting"
          >
            <Trash2 size={16} />
          </button>

          <ChevronDown
            size={16}
            className={`${styles['expand-icon']} ${expanded ? styles['expand-icon--open'] : ''}`}
          />
        </div>
      </div>

      {/* Expanded: Transcript + Actions */}
      {expanded && (
        <div className={styles.transcript}>
          <div className={styles['transcript-header']}>
            <div className={styles['transcript-title']}>
              <FileText size={14} />
              Transcript
            </div>
            <div className={styles['transcript-filter']}>
              {/* Add Transcript button */}
              <button
                className={styles['transcript-action-btn']}
                onClick={(e) => { e.stopPropagation(); onAddTranscript(meeting._id); }}
              >
                <Mic size={12} />
                {transcriptArr.length > 0 ? 'Update' : 'Add'} Transcript
              </button>

              {/* AI Summarize button */}
              {transcriptArr.length > 0 && (
                <button
                  className={styles['transcript-action-btn']}
                  onClick={(e) => { e.stopPropagation(); handleSummarize(); }}
                  disabled={summarizing}
                >
                  <Bot size={12} />
                  {summarizing ? 'Summarizing...' : 'AI Summarize'}
                </button>
              )}

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
              {insightsArr.length > 0 && (
                <button
                  className={`${styles['transcript-filter-btn']} ${showInsightsOnly ? styles['transcript-filter-btn--active'] : ''}`}
                  onClick={() => setShowInsightsOnly(!showInsightsOnly)}
                >
                  <Lightbulb size={10} /> Insights Only
                </button>
              )}
            </div>
          </div>

          {/* AI Summary */}
          {meeting.aiSummary && (
            <div className={styles['ai-summary']}>
              <div className={styles['ai-summary-header']}>
                <Bot size={14} />
                <span>AI Summary</span>
              </div>
              <div
                className={styles['ai-summary-content']}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(meeting.aiSummary) }}
              />
            </div>
          )}

          {transcript.length === 0 ? (
            <div className={styles['no-transcript']}>
              <Mic size={24} style={{ opacity: 0.4 }} />
              <p>{showInsightsOnly ? 'No insights marked yet.' : 'No transcript available.'}</p>
              <span>Record audio or upload an MP3 to generate a transcript.</span>
            </div>
          ) : (
            transcript.map((line, i) => {
              const originalIndex = showInsightsOnly
                ? transcriptArr.indexOf(line)
                : i;
              const isInsight = insightsArr.includes(originalIndex);
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
