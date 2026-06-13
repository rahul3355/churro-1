'use client';

import { useState } from 'react';
import type { CalendarResult } from '../lib/calendar';
import DayModal from './DayModal';

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
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

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedIndex(index);
    }
  };

  return (
    <div>
      <div className="calendar-card">
        <div className="calendar-month-label">{dateLabel.toLowerCase()}</div>

        <div className="calendar-grid" role="grid" aria-label="30-day crowd forecast calendar">
          {DAY_NAMES.map((d) => (
            <div key={d} className="calendar-day-header" role="columnheader">
              {d}
            </div>
          ))}

          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day empty" aria-hidden="true" />
          ))}

          {scores.map((score, i) => {
            const d = new Date(score.date + 'T00:00:00');
            const dayNum = d.getDate();
            const isToday = new Date().toISOString().split('T')[0] === score.date;

            return (
              <div
                key={score.date}
                className={`calendar-day level-${score.level.toLowerCase()}${isToday ? ' today' : ''}`}
                role="gridcell"
                tabIndex={0}
                aria-label={`${score.level} crowd level, score ${score.score}, ${dayNum} ${MONTH_NAMES[d.getMonth()]}`}
                onClick={() => setSelectedIndex(i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
              >
                {isToday && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: 'var(--primary)',
                    }}
                  />
                )}
                <span className="day-num">{dayNum}</span>
                <span className="day-score">{score.score}</span>
              </div>
            );
          })}
        </div>

        <div className="legend">
          <div className="legend-item">
            <div className="legend-dot" style={{ background: 'var(--level-low-text)' }} />
            Low (0-29)
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: 'var(--level-moderate-text)' }} />
            Moderate (30-59)
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: 'var(--level-high-text)' }} />
            High (60-79)
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: 'var(--level-extreme-text)' }} />
            Extreme (80-100)
          </div>
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
