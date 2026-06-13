'use client';

import { useState } from 'react';
import type { CalendarResult } from '../lib/calendar';
import DayModal from './DayModal';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function Calendar({ data }: { data: CalendarResult }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!data?.scores?.length) {
    return <div className="error-message">No calendar data available</div>;
  }

  const scores = data.scores;
  const startDate = new Date(scores[0].date + 'T00:00:00');
  const endDate = new Date(scores[scores.length - 1].date + 'T00:00:00');

  const monthLabel = `${MONTH_NAMES[startDate.getMonth()]} ${startDate.getFullYear()}`;
  const endMonthLabel = `${MONTH_NAMES[endDate.getMonth()]} ${endDate.getFullYear()}`;
  const dateLabel = monthLabel === endMonthLabel ? monthLabel : `${monthLabel} — ${endMonthLabel}`;

  const firstDay = startDate.getDay();

  return (
    <div>
      <h2 style={{ textAlign: 'center', marginTop: 8, fontSize: '1rem', color: '#94a3b8' }}>
        {dateLabel}
      </h2>

      <div className="calendar-grid">
        {DAY_NAMES.map((d) => (
          <div key={d} className="calendar-day-header">{d}</div>
        ))}

        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-day empty" />
        ))}

        {scores.map((score, i) => {
          const d = new Date(score.date + 'T00:00:00');
          const dayNum = d.getDate();
          const levelClass = `level-${score.level.toLowerCase()}`;

          return (
            <div
              key={score.date}
              className={`calendar-day ${levelClass}`}
              onClick={() => setSelectedIndex(i)}
            >
              <span className="day-num">{dayNum}</span>
              <span className="day-score">{score.score}</span>
            </div>
          );
        })}
      </div>

      <div className="legend">
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#166534' }} />
          Low (0-29)
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#854d0e' }} />
          Moderate (30-59)
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#991b1b' }} />
          High (60-79)
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#4c1d95' }} />
          Extreme (80-100)
        </div>
      </div>

      {selectedIndex !== null && (
        <DayModal
          score={scores[selectedIndex]}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </div>
  );
}
