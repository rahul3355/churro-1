import type { NormalizedEvent } from './types';
import { getCached, setCache, getCacheKey } from './cache';

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;

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
    source: 'ticketmaster',
  };
}

function estimateAttendance(
  venue?: TMVenue,
  classification?: TMClassification
): { raw: number; churroEffective: number } {
  const venueName = venue?.name?.toLowerCase() || '';
  const segment = classification?.segment?.name?.toLowerCase() || '';

  // Raw attendance (same heuristic as before)
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

  // Churro conversion weight by venue proximity to Baltic Market
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

export async function fetchTicketmasterEvents(
  latitude: number,
  longitude: number,
  radiusKm: number = 10,
  startDate?: string,
  endDate?: string
): Promise<NormalizedEvent[]> {
  if (!TICKETMASTER_API_KEY) {
    console.warn('TICKETMASTER_API_KEY not set — skipping Ticketmaster fetch');
    return [];
  }
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

  setCache(cacheKey, events);
  return events;
}
