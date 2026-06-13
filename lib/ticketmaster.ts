import type { NormalizedEvent } from './types';
import { getCached, setCache, getCacheKey } from './cache';

const TICKETMASTER_API_KEY = '__REDACTED_API_KEY__';
const BASE_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';

interface TMImage {
  url: string;
  width: number;
  height: number;
}

interface TMVenue {
  name: string;
  city?: { name: string };
  location?: {
    latitude?: string;
    longitude?: string;
  };
}

interface TMClassification {
  segment?: { name: string };
  genre?: { name: string };
}

interface TMEvent {
  id: string;
  name: string;
  url: string;
  dates: {
    start: {
      localDate?: string;
      localTime?: string;
      dateTime?: string;
    };
    end?: {
      localDate?: string;
      localTime?: string;
    };
  };
  images: TMImage[];
  _embedded?: {
    venues?: TMVenue[];
    attractions?: Array<{ name: string }>;
  };
  classifications?: TMClassification[];
  info?: string;
  pleaseNote?: string;
}

interface TMResponse {
  _embedded?: {
    events?: TMEvent[];
  };
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

function normalizeEvent(event: TMEvent): NormalizedEvent {
  const venue = event._embedded?.venues?.[0];
  const classification = event.classifications?.[0];
  const segment = classification?.segment?.name || 'Other';
  const genre = classification?.genre?.name || '';

  let category = 'other';
  const seg = segment.toLowerCase();
  if (seg.includes('music')) category = 'music';
  else if (seg.includes('sport')) category = 'sports';
  else if (seg.includes('arts') || seg.includes('theatre')) category = 'arts';
  else if (seg.includes('family')) category = 'family';
  else if (seg.includes('film')) category = 'film';

  const lat = venue?.location?.latitude ? parseFloat(venue.location.latitude) : null;
  const lng = venue?.location?.longitude ? parseFloat(venue.location.longitude) : null;

  const estimatedAttendance = estimateAttendance(venue, classification);

  return {
    id: 'tm-' + event.id,
    title: event.name,
    venue: venue?.name || 'Unknown Venue',
    date: event.dates.start.localDate || event.dates.start.dateTime?.split('T')[0] || '',
    category,
    latitude: lat,
    longitude: lng,
    estimatedAttendance,
    source: 'ticketmaster',
  };
}

function estimateAttendance(
  venue?: TMVenue,
  classification?: TMClassification
): number {
  const venueName = venue?.name?.toLowerCase() || '';
  const segment = classification?.segment?.name?.toLowerCase() || '';

  if (venueName.includes('anfield')) return 54000;
  if (venueName.includes('goodison')) return 39000;
  if (venueName.includes('m&s bank arena') || venueName.includes('echo arena')) return 10000;
  if (venueName.includes('pier head')) return 20000;
  if (venueName.includes('cavern')) return 300;
  if (venueName.includes('o2 academy') && venueName.includes('liverpool')) return 1000;
  if (venueName.includes('empire theatre') || venueName.includes('empire theater')) return 2000;
  if (venueName.includes('philharmonic')) return 1500;
  if (venueName.includes('camp and furnace') || venueName.includes('camp & furnace')) return 700;
  if (venueName.includes('arena')) return 8000;
  if (venueName.includes('stadium')) return 40000;
  if (venueName.includes('theatre') || venueName.includes('theater')) return 1000;
  if (venueName.includes('club')) return 400;

  if (segment === 'sports') return 15000;
  if (segment === 'music') return 3000;

  return 1500;
}

export async function fetchTicketmasterEvents(
  latitude: number,
  longitude: number,
  radiusKm: number = 10,
  startDate?: string,
  endDate?: string
): Promise<NormalizedEvent[]> {
  const cacheKey = getCacheKey(
    'ticketmaster',
    latitude.toFixed(4),
    longitude.toFixed(4),
    radiusKm.toString(),
    startDate || '',
    endDate || ''
  );
  const cached = getCached<NormalizedEvent[]>(cacheKey);
  if (cached) return cached;

  const events: NormalizedEvent[] = [];
  let page = 0;
  const pageSize = 50;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      apikey: TICKETMASTER_API_KEY,
      latlong: `${latitude},${longitude}`,
      radius: radiusKm.toString(),
      unit: 'km',
      size: pageSize.toString(),
      page: page.toString(),
      sort: 'date,asc',
    });

    if (startDate) params.set('startDateTime', startDate + 'T00:00:00Z');
    if (endDate) params.set('endDateTime', (endDate + 'T23:59:59Z'));

    try {
      const url = `${BASE_URL}?${params.toString()}`;
      const response = await globalThis.fetch(url);

      if (response.status === 429) {
        console.warn('Ticketmaster rate limit hit, returning cached/partial results');
        break;
      }

      if (!response.ok) {
        console.warn('Ticketmaster API returned status', response.status);
        break;
      }

      const data: TMResponse = await response.json();
      const pageEvents = data._embedded?.events || [];

      for (const evt of pageEvents) {
        const normalized = normalizeEvent(evt);
        if (normalized.date) {
          events.push(normalized);
        }
      }

      // Check pagination
      const totalPages = data.page.totalPages;
      page++;
      hasMore = page < totalPages && page < 3; // Max 3 pages (150 events) to stay within rate limits
    } catch (err) {
      console.warn('Ticketmaster fetch failed:', err);
      break;
    }
  }

  setCache(cacheKey, events, 12 * 60 * 60 * 1000); // 12 hour TTL
  return events;
}
