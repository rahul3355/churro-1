'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadDefaultLocation } from '../lib/dataLoader';
import Calendar from '../components/Calendar';
import ChurroIcon from '../components/ChurroIcon';
import type { Location } from '../lib/types';

export default function Home() {
  const [location, setLocation] = useState<Location | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLocation(loadDefaultLocation());
  }, []);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div>
      <section className="hero-band">
        <div className="container">
          <div className="hero-eyebrow">
            Baltic Market, Liverpool
          </div>
          <div className="hero-title-group">
            <ChurroIcon size={48} />
            <h1 className="hero-title hero-title-hover">
              Demand Surge Calendar
            </h1>
          </div>
          <p className="hero-subtitle">
            Predict daily demand at Baltic Market, Liverpool.
          </p>
          <div className="hero-actions">
            <Link href="/docs" className="btn-secondary" style={{ minWidth: '160px' }}>
              How it works
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>
            <button onClick={handleRefresh} className="refresh-link">refresh forecast</button>
          </div>
          {location && <Calendar location={location} refreshKey={refreshKey} />}
          {!location && (
            <div className="loading">
              <div className="loading-spinner" />
              <span className="loading-text">Loading forecast data...</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
