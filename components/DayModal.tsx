'use client';

import { useEffect, useCallback } from 'react';
import type { DayScore } from '../lib/types';

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function DayModal({
  score,
  onClose,
}: {
  score: DayScore;
  onClose: () => void;
}) {
  const d = new Date(score.date + 'T00:00:00');
  const dayName = WEEKDAYS[d.getDay()];
  const monthName = MONTHS[d.getMonth()];
  const dateLabel = `${dayName} ${monthName} ${d.getDate()}`;
  const isoDate = score.date;

  const levelClass = score.level.toLowerCase();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${dateLabel}`}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-date">{dateLabel}</div>
            <span className="modal-date-mono">{isoDate}</span>
          </div>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <div className={`modal-score-hero ${levelClass}`}>
          <div className="modal-score-value">{score.score}</div>
          <div>
            <div className="modal-score-label">out of 100</div>
            <div className="modal-score-level">
              {score.level} crowd level
            </div>
          </div>
        </div>

        {score.weather && (
          <div className="modal-section">
            <div className="modal-section-title">weather</div>
            <div className="weather-info">
              <span>{score.weather.condition}</span>
              <span>{score.weather.temperature}&deg;C</span>
              <span className="weather-meta">
                {score.weather.multiplier}x
              </span>
            </div>
          </div>
        )}

        {(score.events.length > 0 || score.holidays.length > 0) && (
          <div className="modal-section">
            <div className="modal-section-title">events & holidays</div>
            <div>
              {score.events.map((evt) => (
                <div key={evt.id} className="modal-event-item">
                  <div className="modal-event-name">{evt.title}</div>
                  <div className="modal-event-meta">
                    {evt.venue} &middot; ~{evt.estimatedAttendance.toLocaleString()} attendees
                    &middot; {evt.category}
                  </div>
                </div>
              ))}
              {score.holidays.map((h) => (
                <div key={h.date + h.name} className="modal-event-item">
                  <div className="modal-event-name">{h.name}</div>
                  <div className="modal-event-meta">{h.type}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-section">
          <div className="modal-section-title">score breakdown</div>
          <ul className="factors-list">
            {score.contributingFactors
              .filter((f) => f.impact !== 0)
              .map((f, i) => (
                <li key={i}>
                  <span className="factor-desc">{f.description}</span>
                  <span
                    className={`factor-impact ${
                      f.impact > 0 ? 'positive' : f.impact < 0 ? 'negative' : 'neutral'
                    }`}
                  >
                    {f.impact > 0 ? '+' : ''}{f.impact}
                  </span>
                </li>
              ))}
          </ul>
        </div>

        <div className="modal-footer">
          <button className="btn-primary-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
