'use client';

import { useEffect, useState } from 'react';
import { generateCalendar } from '../lib/calendar';
import { loadDefaultLocation } from '../lib/dataLoader';
import { clearCache } from '../lib/cache';
import Calendar from '../components/Calendar';
import type { CalendarResult } from '../lib/calendar';

export default function Home() {
  const [data, setData] = useState<CalendarResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const location = loadDefaultLocation();
      const today = new Date();
      const result = await generateCalendar(location, today);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    clearCache();
    loadData();
  };

  return (
    <div>
      <section className="hero-band">
        <div className="container">
          <div className="hero-eyebrow">
            Liverpool &middot; Crowd Density Forecast
          </div>
          <h1 className="hero-title">
            Population Surge Calendar.
          </h1>
          <p className="hero-subtitle">
            Plan your visit with confidence. See the next 30 days of predicted
            crowd density across Liverpool, powered by real-time event data,
            weather forecasts, and seasonal patterns.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={handleRefresh}>
              Refresh Forecast
            </button>
            <button
              className="btn-secondary"
              onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
            >
              View Calendar
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading && (
            <div className="loading">
              <div className="loading-spinner" />
              <span className="loading-text">Loading forecast data...</span>
            </div>
          )}
          {error && <div className="error-message">{error}</div>}
          {data && <Calendar data={data} />}
        </div>
      </section>
    </div>
  );
}
