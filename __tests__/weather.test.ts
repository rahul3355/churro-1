import { fetchWeather } from '../lib/weather';

const mockOpenMeteoResponse = {
  latitude: 53.5,
  longitude: -3.0,
  generationtime_ms: 0.5,
  utc_offset_seconds: 3600,
  timezone: 'Europe/London',
  timezone_abbreviation: 'GMT+1',
  elevation: 29.0,
  daily_units: {
    time: 'iso8601',
    weather_code: 'wmo code',
    temperature_2m_max: '°C',
  },
  daily: {
    time: ['2026-06-13', '2026-06-14', '2026-06-15'],
    weather_code: [0, 3, 65],
    temperature_2m_max: [22.5, 15.0, 9.0],
  },
};

function mockFetchSuccess(response = mockOpenMeteoResponse) {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => response,
  });
}

describe('Weather API', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('fetches and maps weather data with churro-specific multipliers', async () => {
    mockFetchSuccess();

    const weather = await fetchWeather(53.3934, -2.9851, '2026-06-13', '2026-06-15');

    expect(weather).toHaveLength(3);

    expect(weather[0]).toMatchObject({
      date: '2026-06-13',
      condition: 'Clear',
      temperature: 23,
      weatherCode: 0,
      multiplier: 0.85,
      icon: 'sun',
    });

    expect(weather[1]).toMatchObject({
      date: '2026-06-14',
      condition: 'Overcast',
      temperature: 15,
      weatherCode: 3,
      multiplier: 1.10,
      icon: 'cloud',
    });

    expect(weather[2]).toMatchObject({
      date: '2026-06-15',
      condition: 'Heavy Rain',
      temperature: 9,
      weatherCode: 65,
      multiplier: 1.00,
      icon: 'cloud-rain',
    });
  });

  test('rounds temperatures to nearest integer', async () => {
    mockFetchSuccess({
      ...mockOpenMeteoResponse,
      daily: {
        ...mockOpenMeteoResponse.daily,
        temperature_2m_max: [3.2, 18.7, 0.0],
        weather_code: [0, 0, 0],
      },
    });

    const weather = await fetchWeather(53.3934, -2.9851, '2026-06-13', '2026-06-15');

    expect(weather[0].temperature).toBe(3);
    expect(weather[1].temperature).toBe(19);
    expect(weather[2].temperature).toBe(0);
  });

  test('maps all common WMO weather codes to churro multipliers', async () => {
    const codes = [0, 1, 2, 3, 45, 51, 61, 71, 73, 80, 95, 99];
    mockFetchSuccess({
      ...mockOpenMeteoResponse,
      daily: {
        time: codes.map((_, i) => `2026-06-${13 + i}`),
        weather_code: codes,
        temperature_2m_max: codes.map(() => 15),
      },
    });

    const weather = await fetchWeather(53.3934, -2.9851, '2026-06-13', '2026-06-24');

    expect(weather[0]).toMatchObject({ condition: 'Clear', icon: 'sun', multiplier: 0.85 });
    expect(weather[1]).toMatchObject({ condition: 'Mainly Clear', icon: 'cloud-sun', multiplier: 0.92 });
    expect(weather[2]).toMatchObject({ condition: 'Partly Cloudy', icon: 'cloud-sun', multiplier: 0.92 });
    expect(weather[3]).toMatchObject({ condition: 'Overcast', icon: 'cloud', multiplier: 1.10 });
    expect(weather[4]).toMatchObject({ condition: 'Fog', icon: 'cloud-fog', multiplier: 0.95 });
    expect(weather[5]).toMatchObject({ condition: 'Light Drizzle', icon: 'cloud-drizzle', multiplier: 1.10 });
    expect(weather[6]).toMatchObject({ condition: 'Light Rain', icon: 'cloud-rain', multiplier: 1.25 });
    expect(weather[7]).toMatchObject({ condition: 'Light Snow', icon: 'cloud-snow', multiplier: 1.30 });
    expect(weather[8]).toMatchObject({ condition: 'Snow', icon: 'cloud-snow', multiplier: 1.30 });
    expect(weather[9]).toMatchObject({ condition: 'Rain Showers', icon: 'cloud-rain', multiplier: 1.25 });
    expect(weather[10]).toMatchObject({ condition: 'Thunderstorm', icon: 'cloud-lightning', multiplier: 0.30 });
    expect(weather[11]).toMatchObject({ condition: 'Severe Thunderstorm', icon: 'cloud-lightning', multiplier: 0.25 });
  });

  test('handles unknown weather code gracefully', async () => {
    mockFetchSuccess({
      ...mockOpenMeteoResponse,
      daily: {
        time: ['2026-06-13'],
        weather_code: [999],
        temperature_2m_max: [20],
      },
    });

    const weather = await fetchWeather(53.3934, -2.9851, '2026-06-13', '2026-06-13');

    expect(weather[0]).toMatchObject({
      condition: 'Code 999',
      icon: 'cloud',
      multiplier: 1.0,
    });
  });

  test('returns empty array when entire date range is outside forecast window', async () => {
    globalThis.fetch = jest.fn();

    const weather = await fetchWeather(53.3934, -2.9851, '2026-12-01', '2026-12-30');

    expect(weather).toEqual([]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test('returns empty array on non-ok API response', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({}),
    });

    const weather = await fetchWeather(53.3934, -2.9851, '2026-06-13', '2026-06-15');

    expect(weather).toEqual([]);
    expect(warn).toHaveBeenCalledWith('Open-Meteo API returned', 502);

    warn.mockRestore();
  });

  test('returns empty array on network error', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const weather = await fetchWeather(53.3934, -2.9851, '2026-06-13', '2026-06-15');

    expect(weather).toEqual([]);
    expect(warn).toHaveBeenCalledWith('Failed to fetch weather:', expect.any(Error));

    warn.mockRestore();
  });

  test('uses start_date and end_date to request specific date range', async () => {
    mockFetchSuccess();

    await fetchWeather(53.3934, -2.9851, '2026-06-01', '2026-06-16');

    const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('start_date=2026-06-01');
    expect(url).toContain('end_date=2026-06-16');
    expect(url).not.toContain('forecast_days');
  });

  test('clamps date range to Open-Meteo 15-day forecast limit', async () => {
    mockFetchSuccess();

    await fetchWeather(53.3934, -2.9851, '2026-06-01', '2026-07-15');

    const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('start_date=2026-06-01');

    const now = new Date();
    const maxEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 15));
    const maxEndStr = maxEnd.toISOString().split('T')[0];
    expect(url).toContain(`end_date=${maxEndStr}`);
    expect(url).not.toContain('end_date=2026-07-15');
  });

  test('returns empty array when API response has no daily field', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ latitude: 53, longitude: -3 }),
    });

    const weather = await fetchWeather(53.3934, -2.9851, '2026-06-13', '2026-06-15');

    expect(weather).toEqual([]);
    expect(warn).toHaveBeenCalledWith('Open-Meteo API error:', 'missing daily data');

    warn.mockRestore();
  });

  test('returns empty array when API response contains error field', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ error: true, reason: 'Missing parameter latitude' }),
    });

    const weather = await fetchWeather(53.3934, -2.9851, '2026-06-13', '2026-06-15');

    expect(weather).toEqual([]);
    expect(warn).toHaveBeenCalledWith('Open-Meteo API error:', 'Missing parameter latitude');

    warn.mockRestore();
  });

  test('uses cache when valid cached data exists', async () => {
    const cachedData = [
      {
        date: '2026-06-13',
        condition: 'Clear',
        temperature: 20,
        weatherCode: 0,
        multiplier: 0.85,
        icon: 'sun',
      },
    ];

    window.localStorage.setItem(
      'psc_weather:53.3934:-2.9851:2026-06-13:2026-06-13',
      JSON.stringify({ data: cachedData, timestamp: Date.now(), ttl: 3600000 })
    );

    globalThis.fetch = jest.fn();

    const weather = await fetchWeather(53.3934, -2.9851, '2026-06-13', '2026-06-13');

    expect(weather).toEqual(cachedData);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test('ignores cache when expired', async () => {
    const staleData = [
      {
        date: '2026-06-13',
        condition: 'Clear',
        temperature: 20,
        weatherCode: 0,
        multiplier: 0.85,
        icon: 'sun',
      },
    ];

    window.localStorage.setItem(
      'psc_weather:53.3934:-2.9851:2026-06-13:2026-06-15',
      JSON.stringify({ data: staleData, timestamp: Date.now() - 36000000, ttl: 3600000 })
    );

    mockFetchSuccess({
      ...mockOpenMeteoResponse,
      daily: {
        time: ['2026-06-13'],
        weather_code: [1],
        temperature_2m_max: [18],
      },
    });

    const weather = await fetchWeather(53.3934, -2.9851, '2026-06-13', '2026-06-15');

    expect(globalThis.fetch).toHaveBeenCalled();
    expect(weather).toHaveLength(1);
    expect(weather[0].icon).toBe('cloud-sun');
  });

  test('uses cache for any valid cached data for the same date range', async () => {
    const shortCache = [
      {
        date: '2026-06-13',
        condition: 'Clear',
        temperature: 20,
        weatherCode: 0,
        multiplier: 0.85,
        icon: 'sun',
      },
    ];

    window.localStorage.setItem(
      'psc_weather:53.3934:-2.9851:2026-06-13:2026-06-15',
      JSON.stringify({ data: shortCache, timestamp: Date.now(), ttl: 3600000 })
    );

    globalThis.fetch = jest.fn();

    const weather = await fetchWeather(53.3934, -2.9851, '2026-06-13', '2026-06-15');

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(weather).toHaveLength(1);
    expect(weather[0].icon).toBe('sun');
  });

  test('skips entries with null date, code, or temperature', async () => {
    mockFetchSuccess({
      ...mockOpenMeteoResponse,
      daily: {
        time: ['2026-06-13', '2026-06-14', '2026-06-15'],
        weather_code: [0, 3, null as unknown as number],
        temperature_2m_max: [22.5, null as unknown as number, 9.0],
      },
    });

    const weather = await fetchWeather(53.3934, -2.9851, '2026-06-13', '2026-06-15');

    expect(weather).toHaveLength(1);
    expect(weather[0]).toMatchObject({
      date: '2026-06-13',
      condition: 'Clear',
      temperature: 23,
    });
  });
});
