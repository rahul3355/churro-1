import type { NormalizedEvent } from './types';
import {
  resolveRecurringEvents,
  resolveAnnualEvents,
  getHolidaysForDate,
  getWeekdayMultiplier,
  getTourismMultiplier,
  loadVenues,
} from './dataLoader';
import { computeCrowdScore } from './scoring';
import { fetchWeather } from './weather';
import { fetchTicketmasterEvents } from './ticketmaster';
import { getCached, setCache, getCacheKey } from './cache';
import type { DayScore, Location } from './types';

export interface CalendarResult {
  scores: DayScore[];
  location: Location;
}

export async function generateCalendar(
  location: Location,
  startDate: Date
): Promise<CalendarResult> {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 29);

  const cacheKey = getCacheKey(
    'calendar',
    location.latitude.toFixed(4),
    location.longitude.toFixed(4),
    startDate.toISOString().split('T')[0]
  );
  const cached = getCached<CalendarResult>(cacheKey);
  if (cached) return cached;

  // Resolve events for the date range
  const year = startDate.getFullYear();
  const annualEventsThisYear = resolveAnnualEvents(year);
  const annualEventsNextYear =
    endDate.getFullYear() > year ? resolveAnnualEvents(year + 1) : [];

  const allAnnualEvents = [...annualEventsThisYear, ...annualEventsNextYear];

  // Fetch Ticketmaster events (cached)
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  const ticketmasterEvents = await fetchTicketmasterEvents(
    location.latitude,
    location.longitude,
    location.radiusKm,
    startStr,
    endStr
  );

  const venues = loadVenues();

  const dateRangeEvents: Record<string, NormalizedEvent[]> = {};
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    dateRangeEvents[dateStr] = [];

    // Recurring events for this date
    const recurring = resolveRecurringEvents(current);
    dateRangeEvents[dateStr].push(...recurring);

    // Annual events for this date
    const annual = allAnnualEvents.filter((e) => e.date === dateStr);
    dateRangeEvents[dateStr].push(...annual);

    // Ticketmaster events for this date
    const tmEvents = ticketmasterEvents.filter((e) => e.date === dateStr);
    dateRangeEvents[dateStr].push(...tmEvents);

    current.setDate(current.getDate() + 1);
  }

  // Fetch weather
  const weather = await fetchWeather(
    location.latitude,
    location.longitude,
    30
  );

  // Build scores
  const scores: DayScore[] = [];
  const d = new Date(startDate);

  for (let i = 0; i < 30; i++) {
    const dateStr = d.toISOString().split('T')[0];
    const events = dateRangeEvents[dateStr] || [];
    const holidays = getHolidaysForDate(dateStr);
    const weatherInfo = weather[i] || null;
    const weekdayMult = getWeekdayMultiplier(d);
    const tourismMult = getTourismMultiplier(d);

    const score = computeCrowdScore({
      date: new Date(d),
      location,
      events,
      weather: weatherInfo,
      holidays,
      tourismMultiplier: tourismMult,
      weekdayMultiplier: weekdayMult,
      venues,
    });

    scores.push(score);
    d.setDate(d.getDate() + 1);
  }

  const result: CalendarResult = {
    scores,
    location,
  };

  setCache(cacheKey, result, 1 * 60 * 60 * 1000); // 1 hour TTL
  return result;
}
