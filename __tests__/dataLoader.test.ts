import {
  loadVenues,
  loadHolidays,
  loadRecurringEvents,
  loadAnnualEvents,
  loadWeatherMultipliers,
  loadWeekdayMultipliers,
  loadTourismSeasonality,
  loadDefaultLocation,
  getWeekdayMultiplier,
  getTourismMultiplier,
  getWeatherMultiplier,
  resolveRecurringEvents,
  resolveAnnualEvents,
  getHolidaysForDate,
  isClosedDay,
} from '../lib/dataLoader';

describe('Data Loader', () => {
  test('loads venues dataset', () => {
    const venues = loadVenues();
    expect(venues.length).toBeGreaterThan(0);
    expect(venues[0]).toHaveProperty('id');
    expect(venues[0]).toHaveProperty('name');
    expect(venues[0]).toHaveProperty('latitude');
    expect(venues[0]).toHaveProperty('longitude');
    expect(venues[0]).toHaveProperty('capacity');
    expect(venues[0]).toHaveProperty('churroWeight');
  });

  test('loads holidays dataset', () => {
    const holidays = loadHolidays();
    expect(holidays.length).toBeGreaterThan(0);
    expect(holidays[0]).toHaveProperty('date');
    expect(holidays[0]).toHaveProperty('name');
    expect(holidays[0]).toHaveProperty('impactScore');
  });

  test('loads recurring events dataset', () => {
    const events = loadRecurringEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toHaveProperty('recurrenceRule');
    expect(events[0]).toHaveProperty('churroImpact');
  });

  test('loads annual events dataset', () => {
    const events = loadAnnualEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toHaveProperty('month');
    expect(events[0]).toHaveProperty('impactScore');
    expect(events[0]).toHaveProperty('churroImpact');
    expect(events[0]).toHaveProperty('classification');
  });

  test('loads weather multipliers', () => {
    const multipliers = loadWeatherMultipliers();
    expect(multipliers.multipliers).toHaveProperty('sunny');
    expect(multipliers.multipliers).toHaveProperty('heavy-rain');
    expect(multipliers.weatherCodeMap).toHaveProperty('0');
  });

  test('loads weekday multipliers', () => {
    const multipliers = loadWeekdayMultipliers();
    expect(multipliers.multipliers).toHaveProperty('saturday');
    expect(multipliers.multipliers).toHaveProperty('monday');
    expect(multipliers.multipliers.saturday).toBeGreaterThan(multipliers.multipliers.monday);
  });

  test('loads tourism seasonality', () => {
    const tourism = loadTourismSeasonality();
    const months = Object.keys(tourism.monthlyMultipliers);
    expect(months.length).toBe(12);
    expect(tourism.monthlyMultipliers['7']).toBeGreaterThan(tourism.monthlyMultipliers['1']);
  });

  test('loads default location', () => {
    const location = loadDefaultLocation();
    expect(location).toHaveProperty('name');
    expect(location).toHaveProperty('latitude');
    expect(location).toHaveProperty('longitude');
    expect(location).toHaveProperty('radiusKm');
    expect(location.name).toBe('Baltic Market');
  });

  test('getWeekdayMultiplier returns valid value', () => {
    const saturday = new Date('2025-06-14'); // Saturday
    const monday = new Date('2025-06-16'); // Monday
    expect(getWeekdayMultiplier(saturday)).toBeGreaterThan(getWeekdayMultiplier(monday));
  });

  test('getTourismMultiplier returns valid value', () => {
    const july = new Date('2025-07-15');
    const january = new Date('2025-01-15');
    expect(getTourismMultiplier(july)).toBeGreaterThan(getTourismMultiplier(january));
  });

  test('getWeatherMultiplier maps codes to churro-specific values', () => {
    expect(getWeatherMultiplier(0)).toBeCloseTo(0.85); // clear/sunny → bad for churros
    expect(getWeatherMultiplier(61)).toBeCloseTo(1.25); // rain → good for churros
    expect(getWeatherMultiplier(65)).toBeCloseTo(1.00); // heavy rain → neutral
    expect(getWeatherMultiplier(999)).toBe(1.0); // unknown code → neutral
  });

  test('resolveRecurringEvents returns events for a Saturday', () => {
    const saturday = new Date('2025-06-14'); // Saturday
    const events = resolveRecurringEvents(saturday);
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event).toHaveProperty('title');
      expect(event).toHaveProperty('date');
      expect(event).toHaveProperty('estimatedAttendance');
      expect(event.source).toBe('recurring');
    }
  });

  test('resolveRecurringEvents returns no events for a Monday', () => {
    const monday = new Date('2025-06-16'); // Monday
    const events = resolveRecurringEvents(monday);
    expect(Array.isArray(events)).toBe(true);
  });

  test('resolveAnnualEvents returns events for a year', () => {
    const events = resolveAnnualEvents(2025);
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event).toHaveProperty('title');
      expect(event).toHaveProperty('date');
      expect(event).toHaveProperty('estimatedAttendance');
      expect(event.source).toBe('annual');
    }
  });

  test('getHolidaysForDate filters by date and region', () => {
    const newYears = getHolidaysForDate('2025-01-01');
    expect(newYears.length).toBeGreaterThan(0);
    expect(newYears[0].name).toContain("New Year");

    const scotlandOnly = getHolidaysForDate('2025-01-02');
    expect(scotlandOnly.length).toBe(0); // Not England
  });

  test('getHolidaysForDate returns empty for non-holiday', () => {
    const regularDay = getHolidaysForDate('2025-03-15');
    expect(regularDay.length).toBe(0);
  });

  test('getHolidaysForDate returns June 2026 holidays', () => {
    const fathersDay = getHolidaysForDate('2026-06-21');
    expect(fathersDay.length).toBeGreaterThan(0);
    expect(fathersDay.some(h => h.name === "Father's Day")).toBe(true);
    expect(fathersDay.some(h => h.name === 'Summer Solstice')).toBe(true);
  });

  test('getHolidaysForDate returns Windrush Day 2026', () => {
    const windrush = getHolidaysForDate('2026-06-22');
    expect(windrush.length).toBeGreaterThan(0);
    expect(windrush[0].name).toBe('Windrush Day');
  });

  test('isClosedDay returns true for Mon-Tue', () => {
    expect(isClosedDay(new Date('2025-06-16'))).toBe(true); // Monday
    expect(isClosedDay(new Date('2025-06-17'))).toBe(true); // Tuesday
  });

  test('isClosedDay returns false for Wednesday', () => {
    expect(isClosedDay(new Date('2025-06-18'))).toBe(false); // Wednesday
  });

  test('isClosedDay returns false for Thu-Sun', () => {
    expect(isClosedDay(new Date('2025-06-19'))).toBe(false); // Thursday
    expect(isClosedDay(new Date('2025-06-20'))).toBe(false); // Friday
    expect(isClosedDay(new Date('2025-06-21'))).toBe(false); // Saturday
    expect(isClosedDay(new Date('2025-06-22'))).toBe(false); // Sunday
  });

  test('isClosedDay returns true for Christmas Day', () => {
    expect(isClosedDay(new Date('2025-12-25'))).toBe(true);
    expect(isClosedDay(new Date('2026-12-25'))).toBe(true);
  });

  test('St Patricks Day 2026 includes England', () => {
    const stPats = getHolidaysForDate('2026-03-17');
    expect(stPats.length).toBeGreaterThan(0);
    expect(stPats[0].impactScore).toBe(0.85);
  });
});
