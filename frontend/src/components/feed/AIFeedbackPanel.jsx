import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, ShieldAlert, Sun, Users } from 'lucide-react';
import { aiService } from '../../services/ai.service';
import { postService } from '../../services/post.service';
import styles from './AIFeedbackPanel.module.css';

const PERSONAS_CONFIG = [
  { key: 'investor', label: 'Investor', icon: TrendingUp },
  { key: 'critical', label: 'Critical', icon: ShieldAlert },
  { key: 'optimist', label: 'Optimist', icon: Sun },
  { key: 'team_lead', label: 'Team Lead', icon: Users },
];

/**
 * Simple markdown-to-HTML renderer for AI feedback.
 * Handles **bold**, bullet points (- ), and line breaks.
 */
function renderFeedbackText(text) {
  if (!text) return '';
  // Convert **bold** to <strong>
  let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Convert lines starting with - to list items
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

export default function AIFeedbackPanel({ text, postId, initialFeedbacks }) {
  const [feedbacks, setFeedbacks] = useState(initialFeedbacks || []);
  const [activeTab, setActiveTab] = useState('investor');
  const [loading, setLoading] = useState(!initialFeedbacks || initialFeedbacks.length === 0);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If we already have feedbacks, don't fetch
    if (initialFeedbacks && initialFeedbacks.length > 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchAndSaveFeedback = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await aiService.getFeedback({
          text,
          personas: PERSONAS_CONFIG.map((p) => p.key),
        });

        if (!cancelled && data.feedbacks) {
          setFeedbacks(data.feedbacks);

          // Save valid feedbacks to backend so we don't re-fetch next time
          if (postId) {
            try {
              await postService.saveAIFeedback(postId, data.feedbacks);
            } catch (saveErr) {
              console.warn('Could not cache AI feedback to backend:', saveErr);
              // Non-critical — feedback still displays
            }
          }
        }
      } catch (err) {
        console.error('AI feedback error:', err);
        if (!cancelled) setError('Failed to generate AI feedback. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAndSaveFeedback();
    return () => { cancelled = true; };
  }, [text, postId, initialFeedbacks]);

  const activeFeedback = feedbacks.find((f) => f.persona === activeTab);
  const activePersona = PERSONAS_CONFIG.find((p) => p.key === activeTab);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Sparkles size={14} />
        AI Multi-Persona Feedback
      </div>

      {/* Persona tabs */}
      <div className={styles.tabs}>
        {PERSONAS_CONFIG.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.key}
              className={`${styles.tab} ${activeTab === p.key ? styles['tab--active'] : ''}`}
              onClick={() => setActiveTab(p.key)}
            >
              <Icon size={14} /> {p.label}
            </button>
          );
        })}
      </div>

      {/* Feedback content */}
      {loading ? (
        <div className={styles.loading}>
          <div className={styles['loading-bar']} />
          <div className={styles['loading-bar']} />
          <div className={styles['loading-bar']} />
        </div>
      ) : error ? (
        <p style={{ color: 'var(--accent-danger, #f87171)', fontSize: 'var(--fs-sm)', padding: 'var(--space-3)' }}>
          {error}
        </p>
      ) : activeFeedback ? (
        <div className={styles.feedback}>
          <div className={styles['feedback-persona']}>
            <span className={styles['persona-icon']}>
              {(() => {
                const Icon = activePersona?.icon;
                return Icon ? <Icon size={18} /> : null;
              })()}
            </span>
            {activePersona?.label} Perspective
          </div>
          <div
            className={styles['feedback-text']}
            dangerouslySetInnerHTML={{ __html: renderFeedbackText(activeFeedback.feedback) }}
          />
        </div>
      ) : (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)' }}>
          No feedback available for this persona.
        </p>
      )}
    </div>
  );
}

