'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { generateCalendar } from '../lib/calendar';
import type { CalendarResult } from '../lib/calendar';
import { getCached, setCache, getCacheKey } from '../lib/cache';
import type { DayScore, Location } from '../lib/types';
import DayModal from './DayModal';
import WeatherIcon from './WeatherIcon';

const DAY_NAMES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
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

interface CalendarProps {
  location: Location;
  refreshKey: number;
}

export default function Calendar({ location, refreshKey }: CalendarProps) {
  const [data, setData] = useState<CalendarResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());

  const loadMonth = useCallback(async (month: number, year: number) => {
    setLoading(true);
    try {
      const firstOfMonth = new Date(year, month, 1);
      const startStr = firstOfMonth.toISOString().split('T')[0];

      const cacheKey = getCacheKey(
        'calendar-api',
        location.latitude.toFixed(4),
        location.longitude.toFixed(4),
        startStr
      );

      const cached = getCached<CalendarResult>(cacheKey);
      if (cached && cached.scores && cached.scores.length > 0) {
        setData(cached);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        lat: location.latitude.toString(),
        lon: location.longitude.toString(),
        radius: (location.radiusKm || 10).toString(),
        start: startStr,
      });
      const apiUrl = `/api/forecast?${params.toString()}`;

      let result: CalendarResult;
      try {
        const res = await fetch(apiUrl);
        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }
        const json = await res.json();
        if (json.error) {
          throw new Error(json.error);
        }
        result = json as CalendarResult;
      } catch {
        result = await generateCalendar(location, firstOfMonth);
      }

      setCache(cacheKey, result, 30 * 60 * 1000); // 30 min client-side cache
      setData(result);
    } catch (err) {
      console.warn('Failed to load month', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    loadMonth(currentMonth, currentYear);
  }, [currentMonth, currentYear, loadMonth, refreshKey]);

  const goPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const days = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const result: { day: number; score: DayScore | undefined }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const score = data?.scores?.find((s) => s.date === dateStr);
      result.push({ day, score });
    }

    return result;
  }, [data, currentMonth, currentYear]);

  // Monday-start offset: 0=Mon -> JS getDay: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  const firstOfMonth = new Date(currentYear, currentMonth, 1);
  const jsDay = firstOfMonth.getDay();
  const firstDayOffset = jsDay === 0 ? 6 : jsDay - 1;

  const multipliers = useMemo(
    () => data?.scores?.map((s) => getTopMultiplier(s)) ?? [],
    [data]
  );

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedIndex(index);
      const score = data?.scores?.[index];
      if (score) setSelectedDate(score.date);
    }
  };

  const selectedScore = selectedIndex !== null && data?.scores
    ? data.scores[selectedIndex]
    : null;

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="calendar-card">
        <div className="calendar-month-nav">
          <button
            className="calendar-month-nav-btn"
            onClick={goPrevMonth}
            aria-label="Previous month"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="calendar-month-nav-label">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <button
            className="calendar-month-nav-btn"
            onClick={goNextMonth}
            aria-label="Next month"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {loading && (
          <div className="loading" style={{ minHeight: 200 }}>
            <div className="loading-spinner" />
            <span className="loading-text">Loading forecast data...</span>
          </div>
        )}

        {!loading && (
          <div className="calendar-grid" role="grid" aria-label={`${MONTH_NAMES[currentMonth]} ${currentYear} churro demand forecast`}>
            {DAY_NAMES.map((d) => (
              <div key={d} className="calendar-day-header" role="columnheader">
                {d}
              </div>
            ))}

            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="calendar-day empty" aria-hidden="true" />
            ))}

            {days.map(({ day, score }) => {
              const isToday = score?.date === todayStr;
              const levelClass = score ? `level-${score.level.toLowerCase().replace(/\s+/g, '-')}` : 'level-no-data';
              const scoreIndex = score ? data?.scores?.indexOf(score) ?? null : null;

              return (
                <div
                  key={day}
                  className={`calendar-day ${levelClass}${isToday ? ' today' : ''}`}
                  role="gridcell"
                  tabIndex={score ? 0 : -1}
                  aria-label={score
                    ? `${score.level} demand, score ${score.score}, ${day} ${MONTH_NAMES[currentMonth]}`
                    : `${day} ${MONTH_NAMES[currentMonth]} — no forecast data`}
                  onClick={() => {
                    if (score && scoreIndex !== null) {
                      setSelectedIndex(scoreIndex);
                      setSelectedDate(score.date);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (score && scoreIndex !== null) handleKeyDown(e, scoreIndex);
                  }}
                >
                  {isToday && <span className="today-dot">Today</span>}

                  <span className="cell-main">
                    <span className="day-num">{day}</span>
                    {score && <span className="day-score">{score.score}</span>}
                  </span>

                  {score?.weather && score.level !== 'Closed' && (
                    <span className="cell-weather-row">
                      <WeatherIcon code={score.weather.weatherCode} size={16} />
                      <span className="cell-temp">{score.weather.temperature}&deg;</span>
                    </span>
                  )}

                  {score && score.level !== 'Closed' && (() => {
                    const mult = getTopMultiplier(score);
                    if (!mult) return null;
                    return (
                      <span className={`cell-multiplier-row variant-${mult.variant}`}>
                        <span className="cell-mult-label">{mult.label}</span>
                        <span className="cell-mult-value">
                          {mult.impact > 0 ? '+' : ''}{mult.impact}
                        </span>
                      </span>
                    );
                  })()}
                </div>
              );
            })}

            {/* Fill trailing empty cells to complete the last week */}
            {(() => {
              const totalCells = firstDayOffset + days.length;
              const remaining = (7 - (totalCells % 7)) % 7;
              return Array.from({ length: remaining }).map((_, i) => (
                <div key={`trail-${i}`} className="calendar-day empty" aria-hidden="true" />
              ));
            })()}
          </div>
        )}

        <div className="legend">
          <div className="legend-item">
            <div className="legend-dot closed" />
            Closed
          </div>
          <div className="legend-item">
            <div className="legend-dot quiet" />
            Quiet (1-15)
          </div>
          <div className="legend-item">
            <div className="legend-dot steady" />
            Steady (16-35)
          </div>
          <div className="legend-item">
            <div className="legend-dot busy" />
            Busy (36-60)
          </div>
          <div className="legend-item">
            <div className="legend-dot very-busy" />
            Very Busy (61-80)
          </div>
          <div className="legend-item">
            <div className="legend-dot crush" />
            Crush (81-100)
          </div>
        </div>
      </div>

      {selectedScore && (
        <DayModal
          score={selectedScore}
          onClose={() => {
            setSelectedIndex(null);
            setSelectedDate(null);
          }}
        />
      )}
    </div>
  );
}
