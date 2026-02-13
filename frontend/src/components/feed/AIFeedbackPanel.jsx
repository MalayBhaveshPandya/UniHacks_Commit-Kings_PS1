import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { aiService } from '../../services/ai.service';
import styles from './AIFeedbackPanel.module.css';

const PERSONAS = [
  { key: 'investor', label: 'Investor', icon: '💰' },
  { key: 'critical', label: 'Critical', icon: '🔍' },
  { key: 'optimist', label: 'Optimist', icon: '🌟' },
  { key: 'team_lead', label: 'Team Lead', icon: '👥' },
];

export default function AIFeedbackPanel({ text }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [activeTab, setActiveTab] = useState('investor');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchFeedback = async () => {
      setLoading(true);
      try {
        const data = await aiService.getFeedback({
          text,
          personas: PERSONAS.map((p) => p.key),
        });
        if (!cancelled) {
          setFeedbacks(data.feedbacks);
        }
      } catch (err) {
        console.error('AI feedback error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchFeedback();
    return () => { cancelled = true; };
  }, [text]);

  const activeFeedback = feedbacks.find((f) => f.persona === activeTab);
  const activePersona = PERSONAS.find((p) => p.key === activeTab);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Sparkles size={14} />
        AI Multi-Persona Feedback
      </div>

      {/* Persona tabs */}
      <div className={styles.tabs}>
        {PERSONAS.map((p) => (
          <button
            key={p.key}
            className={`${styles.tab} ${activeTab === p.key ? styles['tab--active'] : ''}`}
            onClick={() => setActiveTab(p.key)}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Feedback content */}
      {loading ? (
        <div className={styles.loading}>
          <div className={styles['loading-bar']} />
          <div className={styles['loading-bar']} />
          <div className={styles['loading-bar']} />
        </div>
      ) : activeFeedback ? (
        <div className={styles.feedback}>
          <div className={styles['feedback-persona']}>
            <span className={styles['persona-icon']}>{activePersona?.icon}</span>
            {activePersona?.label} Perspective
          </div>
          <p className={styles['feedback-text']}>{activeFeedback.feedback}</p>
        </div>
      ) : (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)' }}>
          No feedback available for this persona.
        </p>
      )}
    </div>
  );
}
