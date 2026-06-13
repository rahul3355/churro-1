'use client';

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

  const levelClass = score.level.toLowerCase();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{dateLabel}</h2>

        <div style={{ textAlign: 'center' }}>
          <div className={`score-badge ${levelClass}`}>{score.score}</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: 4 }}>
            {score.level} Crowd Level
          </div>
        </div>

        {score.weather && (
          <>
            <div className="section-title">Weather</div>
            <div className="weather-info">
              <span>{score.weather.condition}</span>
              <span>{score.weather.temperature}°C</span>
              <span style={{ color: '#94a3b8' }}>
                ({score.weather.multiplier}x)
              </span>
            </div>
          </>
        )}

        {(score.events.length > 0 || score.holidays.length > 0) && (
          <>
            <div className="section-title">Events & Holidays</div>
            <ul className="factors-list">
              {score.events.map((evt) => (
                <li key={evt.id}>
                  <strong>{evt.title}</strong>
                  <br />
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                    {evt.venue} &middot; ~{evt.estimatedAttendance.toLocaleString()} attendees
                    &middot; {evt.category}
                  </span>
                </li>
              ))}
              {score.holidays.map((h) => (
                <li key={h.date + h.name}>
                  <strong>{h.name}</strong>
                  <br />
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                    {h.type}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="section-title">Score Breakdown</div>
        <ul className="factors-list">
          {score.contributingFactors
            .filter((f) => f.impact !== 0)
            .map((f, i) => (
              <li key={i}>
                <span>{f.description}</span>
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

        <button className="modal-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
