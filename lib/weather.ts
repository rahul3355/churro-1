import type { WeatherInfo } from './types';
import { getCached, setCache, getCacheKey } from './cache';
import { getWeatherMultiplier } from './dataLoader';

interface OpenMeteoResponse {
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
  };
}

export async function fetchWeather(
  latitude: number,
  longitude: number,
  days: number = 30
): Promise<WeatherInfo[]> {
  const cacheKey = getCacheKey('weather', latitude.toFixed(4), longitude.toFixed(4));
  const cached = getCached<WeatherInfo[]>(cacheKey);

  if (cached && cached.length >= days) {
    return cached.slice(0, days);
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max&timezone=Europe/London&forecast_days=${Math.min(days, 16)}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.warn('Open-Meteo API returned', response.status);
      return [];
    }

    const data: OpenMeteoResponse = await response.json();
    const weather: WeatherInfo[] = [];

    for (let i = 0; i < data.daily.time.length; i++) {
      const code = data.daily.weather_code[i];
      weather.push({
        condition: getConditionFromCode(code),
        temperature: Math.round(data.daily.temperature_2m_max[i]),
        weatherCode: code,
        multiplier: getWeatherMultiplier(code),
      });
    }

    setCache(cacheKey, weather, 3 * 60 * 60 * 1000); // 3 hour TTL
    return weather.slice(0, days);
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
