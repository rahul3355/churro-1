import { computeCrowdScore } from '../lib/scoring';
import type { ScoreInput, Location } from '../lib/types';

const defaultLocation: Location = {
  name: 'Liverpool City Centre',
  latitude: 53.4084,
  longitude: -2.9916,
  radiusKm: 5,
};

describe('Scoring Engine', () => {
  test('returns low score for a quiet weekday with no events', () => {
    const input: ScoreInput = {
      date: new Date('2025-01-14'), // Tuesday in January
      location: defaultLocation,
      events: [],
      weather: {
        condition: 'Cloudy',
        temperature: 5,
        weatherCode: 3,
        multiplier: 1.0,
      },
      holidays: [],
      tourismMultiplier: 0.65,
      weekdayMultiplier: 0.80,
      venues: [],
    };

    const result = computeCrowdScore(input);
    expect(result.score).toBeLessThan(30);
    expect(result.level).toBe('Low');
  });

  test('returns high score for a summer Saturday with events', () => {
    const input: ScoreInput = {
      date: new Date('2025-06-28'), // Saturday in June
      location: defaultLocation,
      events: [
        {
          id: 'test-event-1',
          title: 'Major Concert',
          venue: 'M&S Bank Arena',
          date: '2025-06-28',
          category: 'music',
          latitude: 53.3975,
          longitude: -2.9917,
          estimatedAttendance: 10000,
          source: 'test',
        },
        {
          id: 'test-event-2',
          title: 'Football Match',
          venue: 'Anfield',
          date: '2025-06-28',
          category: 'sports',
          latitude: 53.4308,
          longitude: -2.9608,
          estimatedAttendance: 54000,
          source: 'test',
        },
      ],
      weather: {
        condition: 'Sunny',
        temperature: 22,
        weatherCode: 0,
        multiplier: 1.15,
      },
      holidays: [],
      tourismMultiplier: 1.10,
      weekdayMultiplier: 1.50,
      venues: [],
    };

    const result = computeCrowdScore(input);
    expect(result.score).toBeGreaterThan(30);
    expect(result.contributingFactors.length).toBeGreaterThan(2);
  });

  test('returns extreme score for big event day', () => {
    const input: ScoreInput = {
      date: new Date('2025-08-24'), // Summer bank holiday weekend
      location: defaultLocation,
      events: [
        {
          id: 'big-event',
          title: 'Mathew Street Festival',
          venue: 'Pier Head',
          date: '2025-08-24',
          category: 'music',
          latitude: 53.4058,
          longitude: -2.9972,
          estimatedAttendance: 300000,
          source: 'test',
        },
      ],
      weather: {
        condition: 'Sunny',
        temperature: 25,
        weatherCode: 0,
        multiplier: 1.15,
      },
      holidays: [
        {
          date: '2025-08-25',
          name: 'Summer Bank Holiday',
          type: 'bank-holiday',
          impactScore: 0.95,
          regions: ['england'],
        },
      ],
      tourismMultiplier: 1.20,
      weekdayMultiplier: 1.50,
      venues: [],
    };

    const result = computeCrowdScore(input);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.level).toBe('Extreme');
  });

  test('score is always between 0 and 100', () => {
    for (let i = 0; i < 20; i++) {
      const input: ScoreInput = {
        date: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        location: defaultLocation,
        events: Array.from({ length: Math.floor(Math.random() * 5) }, (_, j) => ({
          id: `test-${j}`,
          title: `Event ${j}`,
          venue: 'Pier Head',
          date: '2025-06-15',
          category: 'music',
          latitude: 53.4058,
          longitude: -2.9972,
          estimatedAttendance: Math.random() * 200000,
          source: 'test',
        })),
        weather: {
          condition: 'Clear',
          temperature: 15,
          weatherCode: 0,
          multiplier: 1.15,
        },
        holidays: [],
        tourismMultiplier: 0.8 + Math.random() * 0.5,
        weekdayMultiplier: 0.75 + Math.random() * 0.75,
        venues: [],
      };
      const result = computeCrowdScore(input);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });

  test('contributing factors are present in result', () => {
    const input: ScoreInput = {
      date: new Date('2025-06-14'),
      location: defaultLocation,
      events: [
        {
          id: 'test',
          title: 'Test Event',
          venue: 'Pier Head',
          date: '2025-06-14',
          category: 'music',
          latitude: 53.4058,
          longitude: -2.9972,
          estimatedAttendance: 5000,
          source: 'test',
        },
      ],
      weather: {
        condition: 'Clear',
        temperature: 20,
        weatherCode: 0,
        multiplier: 1.15,
      },
      holidays: [],
      tourismMultiplier: 1.10,
      weekdayMultiplier: 1.50,
      venues: [],
    };

    const result = computeCrowdScore(input);
    expect(result.contributingFactors.length).toBeGreaterThan(0);
    expect(result.weather).not.toBeNull();
    expect(result.date).toBe('2025-06-14');
  });
});
