'use client';

import { useState, useMemo } from 'react';
import type { CalendarResult } from '../lib/calendar';
import type { DayScore } from '../lib/types';
import DayModal from './DayModal';
import WeatherIcon from './WeatherIcon';

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getTopMultiplier(score: DayScore): {
  label: string;
  impact: number;
  variant: 'high' | 'mid' | 'low' | 'neg';
} | null {
  const factors = score.contributingFactors.filter((f) => f.impact !== 0);
  if (!factors.length) return null;

  let top = factors[0];
  for (let i = 1; i < factors.length; i++) {
    if (Math.abs(factors[i].impact) > Math.abs(top.impact)) {
      top = factors[i];
    }
  }

  const abs = Math.abs(top.impact);
  let variant: 'high' | 'mid' | 'low' | 'neg';
  if (abs >= 15) variant = 'high';
  else if (abs >= 8) variant = 'mid';
  else if (top.impact > 0) variant = 'low';
  else variant = 'neg';

  return {
    label:
      top.name.length > 14 ? top.name.slice(0, 13) + '\u2026' : top.name,
    impact: top.impact,
    variant,
  };
}

export default function Calendar({ data }: { data: CalendarResult }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const multipliers = useMemo(
    () => data?.scores?.map((s) => getTopMultiplier(s)) ?? [],
    [data]
  );

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
            const mult = multipliers[i];

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
                  <span className="today-dot" />
                )}

                <span className="cell-main">
                  <span className="day-num">{dayNum}</span>
                  <span className="day-score">{score.score}</span>
                </span>

                {score.weather && (
                  <span className="cell-weather-row">
                    <WeatherIcon code={score.weather.weatherCode} size={16} />
                    <span className="cell-temp">{score.weather.temperature}&deg;</span>
                  </span>
                )}

                {mult && (
                  <span className={`cell-multiplier-row variant-${mult.variant}`}>
                    <span className="cell-mult-label">{mult.label}</span>
                    <span className="cell-mult-value">
                      {mult.impact > 0 ? '+' : ''}{mult.impact}
                    </span>
                  </span>
                )}
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
