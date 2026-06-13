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
    <div className="container">
      <div className="header">
        <h1>Population Surge Calendar</h1>
        <p>
          Liverpool &middot; Next 30 Days &middot; Crowd Density Forecast
        </p>
        <button
          onClick={handleRefresh}
          style={{
            marginTop: 12,
            padding: '6px 16px',
            background: '#334155',
            color: '#e2e8f0',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          Refresh Data
        </button>
      </div>

      {loading && <div className="loading">Loading calendar data...</div>}
      {error && <div className="error-message">{error}</div>}
      {data && <Calendar data={data} />}
    </div>
  );
}
