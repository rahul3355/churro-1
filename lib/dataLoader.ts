import type {
  Venue,
  Holiday,
  RecurringEvent,
  AnnualEvent,
  WeatherMultipliers,
  WeekdayMultipliers,
  TourismSeasonality,
  NormalizedEvent,
  Location,
} from './types';
import venuesData from '../data/venues.json';
import holidaysData from '../data/holidays.json';
import recurringEventsData from '../data/recurring-events.json';
import annualEventsData from '../data/annual-events.json';
import weatherMultipliersData from '../data/weather-multipliers.json';
import weekdayMultipliersData from '../data/weekday-multipliers.json';
import tourismData from '../data/tourism-seasonality.json';
import configData from '../data/config.json';

export function loadVenues(): Venue[] {
  return venuesData.venues;
}

export function loadHolidays(): Holiday[] {
  return holidaysData.holidays;
}

export function loadRecurringEvents(): RecurringEvent[] {
  return recurringEventsData.recurringEvents;
}

export function loadAnnualEvents(): AnnualEvent[] {
  return annualEventsData.annualEvents;
}

export function loadWeatherMultipliers(): WeatherMultipliers {
  return weatherMultipliersData;
}

export function loadWeekdayMultipliers(): WeekdayMultipliers {
  return weekdayMultipliersData;
}

export function loadTourismSeasonality(): TourismSeasonality {
  return tourismData;
}

export function loadDefaultLocation(): Location {
  return configData.meta.defaultLocation;
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function getWeekdayMultiplier(date: Date): number {
  const multipliers = loadWeekdayMultipliers();
  const day = WEEKDAYS[date.getDay()];
  return multipliers.multipliers[day] || 1.0;
}

export function getTourismMultiplier(date: Date): number {
  const tourism = loadTourismSeasonality();
  const month = (date.getMonth() + 1).toString();
  return tourism.monthlyMultipliers[month] || 1.0;
}

export function getWeatherMultiplier(weatherCode: number): number {
  const weatherMultipliers = loadWeatherMultipliers();
  const codeStr = weatherCode.toString();
  const condition = weatherMultipliers.weatherCodeMap[codeStr];
  if (!condition) return 1.0;
  return weatherMultipliers.multipliers[condition] || 1.0;
}

export function resolveRecurringEvents(date: Date): NormalizedEvent[] {
  const recurring = loadRecurringEvents();
  const events: NormalizedEvent[] = [];
  const dateStr = date.toISOString().split('T')[0];
  const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
  const dayOfMonth = date.getDate();
  const venues = loadVenues();

  for (const re of recurring) {
    let matches = false;

    switch (re.recurrenceRule) {
      case 'weekend-sat-sun':
        matches = dayOfWeek === 0 || dayOfWeek === 6;
        break;
      case 'weekly-sunday':
        matches = dayOfWeek === 0;
        break;
      case 'weekly-saturday':
        matches = dayOfWeek === 6;
        break;
      case 'weekly-thursday':
        matches = dayOfWeek === 4;
        break;
      case 'weekly-friday':
        matches = dayOfWeek === 5;
        break;
      case 'monthly-first-saturday':
        matches = dayOfWeek === 6 && dayOfMonth <= 7;
        break;
      case 'monthly-last-saturday':
        matches = dayOfWeek === 6 && dayOfMonth >= 24;
        break;
      case 'monthly-last-sunday':
        matches = dayOfWeek === 0 && dayOfMonth >= 24;
        break;
      default:
        break;
    }

    if (matches) {
      const venue = re.venueId ? venues.find((v) => v.id === re.venueId) : null;
      events.push({
        id: re.id + '-' + dateStr,
        title: re.name,
        venue: re.location,
        date: dateStr,
        category: re.category,
        latitude: venue?.latitude ?? null,
        longitude: venue?.longitude ?? null,
        estimatedAttendance: re.estimatedAttendance,
        source: 'recurring',
      });
    }
  }

  return events;
}

export function resolveAnnualEvents(year: number): NormalizedEvent[] {
  const annual = loadAnnualEvents();
  const venues = loadVenues();
  const events: NormalizedEvent[] = [];

  for (const ae of annual) {
    // Parse datePattern into approximate dates
    const dates = approximateDates(ae.datePattern, ae.month, year);

    for (const d of dates) {
      const venue = ae.venueId ? venues.find((v) => v.id === ae.venueId) : null;
      events.push({
        id: ae.id + '-' + d,
        title: ae.name,
        venue: venue?.name ?? ae.name,
        date: d,
        category: ae.category,
        latitude: venue?.latitude ?? null,
        longitude: venue?.longitude ?? null,
        estimatedAttendance: ae.attendanceEstimate,
        source: 'annual',
      });
    }
  }

  return events;
}

function approximateDates(
  pattern: string,
  month: number,
  year: number
): string[] {
  const dates: string[] = [];
  const m = String(month).padStart(2, '0');

  switch (pattern) {
    case 'first-weekend': {
      const first = new Date(year, month - 1, 1);
      while (first.getDay() !== 5) first.setDate(first.getDate() + 1);
      for (let i = 0; i < 3; i++) {
        const d = new Date(first);
        d.setDate(d.getDate() + i);
        dates.push(formatDate(d));
      }
      break;
    }
    case 'first-saturday': {
      const first = new Date(year, month - 1, 1);
      while (first.getDay() !== 6) first.setDate(first.getDate() + 1);
      for (let i = 0; i < 3; i++) {
        const d = new Date(first);
        d.setDate(d.getDate() + i);
        dates.push(formatDate(d));
      }
      break;
    }
    case 'second-weekend':
    case 'mid-month': {
      const mid = new Date(year, month - 1, 14);
      while (mid.getDay() !== 5) mid.setDate(mid.getDate() + 1);
      for (let i = 0; i < 3; i++) {
        const d = new Date(mid);
        d.setDate(d.getDate() + i);
        dates.push(formatDate(d));
      }
      break;
    }
    case 'mid-month-weekend': {
      const mid = new Date(year, month - 1, 14);
      while (mid.getDay() !== 5) mid.setDate(mid.getDate() + 1);
      for (let i = 0; i < 3; i++) {
        const d = new Date(mid);
        d.setDate(d.getDate() + i);
        dates.push(formatDate(d));
      }
      break;
    }
    case 'third-weekend': {
      const third = new Date(year, month - 1, 15);
      while (third.getDay() !== 5) third.setDate(third.getDate() + 1);
      for (let i = 0; i < 3; i++) {
        const d = new Date(third);
        d.setDate(d.getDate() + i);
        dates.push(formatDate(d));
      }
      break;
    }
    case 'third-friday': {
      const third = new Date(year, month - 1, 15);
      while (third.getDay() !== 5) third.setDate(third.getDate() + 1);
      dates.push(formatDate(third));
      break;
    }
    case 'fourth-weekend': {
      const fourth = new Date(year, month - 1, 22);
      while (fourth.getDay() !== 5) fourth.setDate(fourth.getDate() + 1);
      for (let i = 0; i < 3; i++) {
        const d = new Date(fourth);
        d.setDate(d.getDate() + i);
        dates.push(formatDate(d));
      }
      break;
    }
    case 'last-weekend': {
      const last = new Date(year, month, 0);
      while (last.getDay() !== 5) last.setDate(last.getDate() - 1);
      for (let i = 0; i < 3; i++) {
        const d = new Date(last);
        d.setDate(d.getDate() + i);
        dates.push(formatDate(d));
      }
      break;
    }
    case 'bank-holiday-weekend': {
      const lastMonday = new Date(year, month, 0);
      while (lastMonday.getDay() !== 1) lastMonday.setDate(lastMonday.getDate() - 1);
      const sat = new Date(lastMonday);
      sat.setDate(sat.getDate() - 2);
      for (let i = 0; i < 3; i++) {
        const d = new Date(sat);
        d.setDate(d.getDate() + i);
        dates.push(formatDate(d));
      }
      break;
    }
    case 'last-saturday': {
      const last = new Date(year, month, 0);
      while (last.getDay() !== 6) last.setDate(last.getDate() - 1);
      dates.push(formatDate(last));
      break;
    }
    case 'mid-november': {
      const start = new Date(year, 10, 14); // Nov 14
      for (let i = 0; i < 45; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        if (d.getMonth() === 11 || d.getMonth() === 10) {
          dates.push(formatDate(d));
        }
      }
      break;
    }
    case 'variable':
      // Skip events with variable dates unless we have specific year data
      break;
    default:
      break;
  }

  return dates;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getHolidaysForDate(dateStr: string): Holiday[] {
  const holidays = loadHolidays();
  return holidays.filter(
    (h) => h.date === dateStr && h.regions.includes('england')
  );
}

export function isClosedDay(date: Date): boolean {
  const dow = date.getDay();
  // Baltic Market closed Mon (1), Tue (2), Wed (3)
  if (dow === 1 || dow === 2 || dow === 3) return true;
  const dateStr = date.toISOString().split('T')[0];
  // Check against known closure dates
  const knownClosures = ['2025-12-25', '2026-12-25'];
  return knownClosures.includes(dateStr);
}
