import type { WeatherInfo } from './types';
import { getCached, setCache, getCacheKey } from './cache';
import { getWeatherMultiplier } from './dataLoader';

interface OpenMeteoResponse {
  error?: boolean;
  reason?: string;
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
  };
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

export async function fetchWeather(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string
): Promise<WeatherInfo[]> {
  const range = clampForecastRange(startDate, endDate);
  if (!range) return [];

  const cacheKey = getCacheKey('weather', latitude.toFixed(4), longitude.toFixed(4), range.startDate, range.endDate);
  const cached = getCached<WeatherInfo[]>(cacheKey);

  if (cached && cached.length > 0) {
    return cached;
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(latitude));
    url.searchParams.set('longitude', String(longitude));
    url.searchParams.set('daily', 'weather_code,temperature_2m_max');
    url.searchParams.set('timezone', 'Europe/London');
    url.searchParams.set('start_date', range.startDate);
    url.searchParams.set('end_date', range.endDate);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(url.toString(), { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.warn('Open-Meteo API returned', response.status);
      return [];
    }

    const data: OpenMeteoResponse = await response.json();

    if (data.error || !data.daily) {
      console.warn('Open-Meteo API error:', data.reason || 'missing daily data');
      return [];
    }

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

    setCache(cacheKey, weather, 3 * 60 * 60 * 1000);
    return weather;
  } catch (err) {
    console.warn('Failed to fetch weather:', err);
    return [];
  }
}

function getConditionFromCode(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Clear',
    1: 'Mainly Clear',
    2: 'Partly Cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Rime Fog',
    51: 'Light Drizzle',
    53: 'Drizzle',
    55: 'Heavy Drizzle',
    61: 'Light Rain',
    63: 'Rain',
    65: 'Heavy Rain',
    71: 'Light Snow',
    73: 'Snow',
    75: 'Heavy Snow',
    80: 'Rain Showers',
    81: 'Heavy Rain Showers',
    82: 'Violent Rain',
    95: 'Thunderstorm',
    96: 'Thunderstorm w/ Hail',
    99: 'Severe Thunderstorm',
  };
  return conditions[code] || `Code ${code}`;
}

function getIconFromCode(code: number): string {
  const icons: Record<number, string> = {
    0: 'sun',
    1: 'cloud-sun',
    2: 'cloud-sun',
    3: 'cloud',
    45: 'cloud-fog',
    48: 'cloud-fog',
    51: 'cloud-drizzle',
    53: 'cloud-drizzle',
    55: 'cloud-drizzle',
    61: 'cloud-rain',
    63: 'cloud-rain',
    65: 'cloud-rain',
    71: 'cloud-snow',
    73: 'cloud-snow',
    75: 'cloud-snow',
    80: 'cloud-rain',
    81: 'cloud-rain',
    82: 'cloud-rain',
    95: 'cloud-lightning',
    96: 'cloud-lightning',
    99: 'cloud-lightning',
  };
  return icons[code] || 'cloud';
}
