import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  resolveRecurringEvents,
  resolveAnnualEvents,
  getHolidaysForDate,
  getWeekdayMultiplier,
  getTourismMultiplier,
  getWeatherMultiplier,
  loadVenues,
} from '../../../lib/dataLoader';
import { computeCrowdScore } from '../../../lib/scoring';
import type {
  WeatherInfo,
  NormalizedEvent,
  DayScore,
  Location,
} from '../../../lib/types';
import type { CalendarResult } from '../../../lib/calendar';

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY || '';
const TM_BASE_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';

interface TMImage { url: string; width: number; height: number; }
interface TMVenue {
  name: string;
  city?: { name: string };
  location?: { latitude?: string; longitude?: string };
}
interface TMClassification { segment?: { name: string }; genre?: { name: string }; }
interface TMEvent {
  id: string;
  name: string;
  url: string;
  dates: {
    start: { localDate?: string; localTime?: string; dateTime?: string };
    end?: { localDate?: string; localTime?: string };
  };
  images: TMImage[];
  _embedded?: { venues?: TMVenue[]; attractions?: Array<{ name: string }> };
  classifications?: TMClassification[];
  info?: string;
  pleaseNote?: string;
}
interface TMResponse {
  _embedded?: { events?: TMEvent[] };
  page: { size: number; totalElements: number; totalPages: number; number: number };
}
interface OpenMeteoResponse {
  error?: boolean;
  reason?: string;
  daily?: { time: string[]; weather_code: number[]; temperature_2m_max: number[] };
}

function normalizeTicketmasterEvent(event: TMEvent): NormalizedEvent {
  const venue = event._embedded?.venues?.[0];
  const classification = event.classifications?.[0];
  const segment = classification?.segment?.name || 'Other';

  let category = 'other';
  const seg = segment.toLowerCase();
  if (seg.includes('music')) category = 'music';
  else if (seg.includes('sport')) category = 'sports';
  else if (seg.includes('arts') || seg.includes('theatre')) category = 'arts';
  else if (seg.includes('family')) category = 'family';
  else if (seg.includes('film')) category = 'film';

  const lat = venue?.location?.latitude ? parseFloat(venue.location.latitude) : null;
  const lng = venue?.location?.longitude ? parseFloat(venue.location.longitude) : null;
  const est = estimateAttendance(venue, classification);

  return {
    id: 'tm-' + event.id,
    title: event.name,
    venue: venue?.name || 'Unknown Venue',
    date: event.dates.start.localDate || event.dates.start.dateTime?.split('T')[0] || '',
    category,
    latitude: lat,
    longitude: lng,
    estimatedAttendance: est.churroEffective,
    source: 'ticketmaster' as const,
  };
}

function estimateAttendance(
  venue?: TMVenue,
  classification?: TMClassification
): { raw: number; churroEffective: number } {
  const venueName = venue?.name?.toLowerCase() || '';
  const segment = classification?.segment?.name?.toLowerCase() || '';

  let raw = 1500;
  if (venueName.includes('anfield')) raw = 54000;
  else if (venueName.includes('goodison')) raw = 39000;
  else if (venueName.includes('baltic market')) raw = 2000;
  else if (venueName.includes('camp and furnace') || venueName.includes('camp & furnace')) raw = 800;
  else if (venueName.includes('m&s bank arena') || venueName.includes('echo arena')) raw = 10000;
  else if (venueName.includes('pier head')) raw = 20000;
  else if (venueName.includes('cavern')) raw = 300;
  else if (venueName.includes('o2 academy') && venueName.includes('liverpool')) raw = 1000;
  else if (venueName.includes('empire theatre') || venueName.includes('empire theater')) raw = 2000;
  else if (venueName.includes('philharmonic')) raw = 1500;
  else if (venueName.includes('arena')) raw = 8000;
  else if (venueName.includes('stadium')) raw = 40000;
  else if (venueName.includes('theatre') || venueName.includes('theater')) raw = 1000;
  else if (venueName.includes('club')) raw = 400;
  else if (segment === 'sports') raw = 15000;
  else if (segment === 'music') raw = 3000;

  let churroWeight = 0.05;
  if (venueName.includes('baltic market')) churroWeight = 1.00;
  else if (venueName.includes('camp and furnace') || venueName.includes('camp & furnace')) churroWeight = 0.90;
  else if (venueName.includes('m&s bank arena') || venueName.includes('echo arena')) churroWeight = 0.08;
  else if (venueName.includes('albert dock')) churroWeight = 0.05;
  else if (venueName.includes('liverpool one')) churroWeight = 0.03;
  else if (venueName.includes('pier head')) churroWeight = 0.03;
  else if (venueName.includes('o2 academy') && venueName.includes('liverpool')) churroWeight = 0.06;
  else if (venueName.includes('cavern')) churroWeight = 0.04;
  else if (venueName.includes('anfield') || venueName.includes('goodison') || venueName.includes('aintree')) churroWeight = 0.005;

  return { raw, churroEffective: Math.round(raw * churroWeight) };
}

const MAX_FORECAST_DAYS = 15;
const MAX_PAST_DAYS = 92;

function clampForecastRange(startDate: string, endDate: string): { startDate: string; endDate: string } | null {
  const now = new Date();
  const maxEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + MAX_FORECAST_DAYS));
  const maxEndStr = maxEnd.toISOString().split('T')[0];
  const minStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - MAX_PAST_DAYS));
  const minStartStr = minStart.toISOString().split('T')[0];

  if (endDate < minStartStr || startDate > maxEndStr) {
    return null;
  }

  return {
    startDate: startDate < minStartStr ? minStartStr : startDate,
    endDate: endDate > maxEndStr ? maxEndStr : endDate,
  };
}

async function fetchWeatherServer(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string
): Promise<WeatherInfo[]> {
  const range = clampForecastRange(startDate, endDate);
  if (!range) return [];

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('daily', 'weather_code,temperature_2m_max');
  url.searchParams.set('timezone', 'Europe/London');
  url.searchParams.set('start_date', range.startDate);
  url.searchParams.set('end_date', range.endDate);

  const res = await fetch(url.toString(), { next: { revalidate: false } });

  if (!res.ok) {
    console.warn('Open-Meteo API returned', res.status);
    return [];
  }

  const data: OpenMeteoResponse = await res.json();
  if (data.error || !data.daily) return [];

  const weather: WeatherInfo[] = [];
  for (let i = 0; i < data.daily.time.length; i++) {
    const date = data.daily.time[i];
    const code = data.daily.weather_code[i];
    const temp = data.daily.temperature_2m_max[i];
    if (date == null || code == null || temp == null) continue;
    weather.push({
      date,
      condition: getConditionFromCode(code),
      temperature: Math.round(temp),
      weatherCode: code,
      multiplier: getWeatherMultiplier(code),
      icon: getIconFromCode(code),
    });
  }
  return weather;
}

async function fetchTicketmasterServer(
  latitude: number,
  longitude: number,
  radiusKm: number,
  startDate: string,
  endDate: string
): Promise<NormalizedEvent[]> {
  if (!TICKETMASTER_API_KEY) return [];
  const events: NormalizedEvent[] = [];
  const pageSize = 50;

  // Fetch page 0 first to discover total pages
  const baseParams = new URLSearchParams({
    apikey: TICKETMASTER_API_KEY,
    latlong: `${latitude},${longitude}`,
    radius: radiusKm.toString(),
    unit: 'km',
    size: pageSize.toString(),
    sort: 'date,asc',
  });
  if (startDate) baseParams.set('startDateTime', startDate + 'T00:00:00Z');
  if (endDate) baseParams.set('endDateTime', endDate + 'T23:59:59Z');

  // Collect all page URLs
  const pageUrls: { url: string; page: number }[] = [];
  for (let page = 0; page < 3; page++) {
    const params = new URLSearchParams(baseParams);
    params.set('page', page.toString());
    pageUrls.push({ url: `${TM_BASE_URL}?${params.toString()}`, page });
  }

  // Fetch all pages in parallel (cached indefinitely)
  const responses = await Promise.all(
    pageUrls.map(({ url }) =>
      fetch(url, { next: { revalidate: false } })
    )
  );

  for (let i = 0; i < responses.length; i++) {
    const res = responses[i];
    if (res.status === 429) {
      console.warn('Ticketmaster rate limit hit on page', i);
      break;
    }
    if (!res.ok) {
      console.warn('Ticketmaster API returned status', res.status);
      break;
    }

    const data: TMResponse = await res.json();
    const pageEvents = data._embedded?.events || [];
    for (const evt of pageEvents) {
      const normalized = normalizeTicketmasterEvent(evt);
      if (normalized.date) events.push(normalized);
    }

    // Stop if we've exhausted pages
    if (data.page.number + 1 >= data.page.totalPages) break;
  }

  return events;
}

function getConditionFromCode(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime Fog', 51: 'Light Drizzle', 53: 'Drizzle',
    55: 'Heavy Drizzle', 61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
    71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow', 80: 'Rain Showers',
    81: 'Heavy Rain Showers', 82: 'Violent Rain', 95: 'Thunderstorm',
    96: 'Thunderstorm w/ Hail', 99: 'Severe Thunderstorm',
  };
  return conditions[code] || `Code ${code}`;
}

function getIconFromCode(code: number): string {
  const icons: Record<number, string> = {
    0: 'sun', 1: 'cloud-sun', 2: 'cloud-sun', 3: 'cloud',
    45: 'cloud-fog', 48: 'cloud-fog', 51: 'cloud-drizzle', 53: 'cloud-drizzle',
    55: 'cloud-drizzle', 61: 'cloud-rain', 63: 'cloud-rain', 65: 'cloud-rain',
    71: 'cloud-snow', 73: 'cloud-snow', 75: 'cloud-snow', 80: 'cloud-rain',
    81: 'cloud-rain', 82: 'cloud-rain', 95: 'cloud-lightning', 96: 'cloud-lightning',
    99: 'cloud-lightning',
  };
  return icons[code] || 'cloud';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '53.3934');
  const lon = parseFloat(searchParams.get('lon') || '-2.9851');
  const radiusKm = parseInt(searchParams.get('radius') || '10', 10);
  const start = searchParams.get('start');

  if (!start || isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'Missing or invalid params: lat, lon, start' }, { status: 400 });
  }

  const startDate = new Date(start + 'T00:00:00Z');
  if (isNaN(startDate.getTime())) {
    return NextResponse.json({ error: 'Invalid start date' }, { status: 400 });
  }

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 29);

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  const location: Location = {
    name: 'Baltic Market',
    latitude: lat,
    longitude: lon,
    radiusKm,
  };

  try {
    const [weatherEntries, ticketmasterEvents] = await Promise.all([
      fetchWeatherServer(lat, lon, startStr, endStr),
      fetchTicketmasterServer(lat, lon, radiusKm, startStr, endStr),
    ]);

    const year = startDate.getFullYear();
    const annualEventsThisYear = resolveAnnualEvents(year);
    const annualEventsNextYear = endDate.getFullYear() > year ? resolveAnnualEvents(year + 1) : [];
    const allAnnualEvents = [...annualEventsThisYear, ...annualEventsNextYear];

    const venues = loadVenues();
    const weatherMap: Record<string, WeatherInfo> = {};
    for (const w of weatherEntries) {
      weatherMap[w.date] = w;
    }

    const dateRangeEvents: Record<string, NormalizedEvent[]> = {};
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      dateRangeEvents[dateStr] = [];

      const recurring = resolveRecurringEvents(current);
      dateRangeEvents[dateStr].push(...recurring);

      const annual = allAnnualEvents.filter((e) => e.date === dateStr);
      dateRangeEvents[dateStr].push(...annual);

      const tmEvents = ticketmasterEvents.filter((e) => e.date === dateStr);
      dateRangeEvents[dateStr].push(...tmEvents);

      current.setDate(current.getDate() + 1);
    }

    const scores: DayScore[] = [];
    const d = new Date(startDate);
    for (let i = 0; i < 30; i++) {
      const dateStr = d.toISOString().split('T')[0];
      const events = dateRangeEvents[dateStr] || [];
      const holidays = getHolidaysForDate(dateStr);
      const weatherInfo = weatherMap[dateStr] || null;
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

    const result: CalendarResult = { scores, location };

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('Forecast API error:', err);
    return NextResponse.json(
      { error: 'Failed to generate forecast' },
      { status: 500 }
    );
  }
}
