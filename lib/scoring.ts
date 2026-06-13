import type {
  NormalizedEvent,
  DayScore,
  ContributingFactor,
  WeatherInfo,
  Holiday,
  Venue,
  ScoreInput,
} from './types';

const MAX_EVENT_SCORE = 60;
const MAX_VENUE_SCORE = 20;
const MAX_MULTIPLIER_SCORE = 20;

function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeCrowdScore(input: ScoreInput): DayScore {
  const factors: ContributingFactor[] = [];

  let totalScore = 0;

  // 1. Event contribution (0-60 points)
  let eventScore = 0;
  for (const event of input.events) {
    let eventImpact = 0;

    if (event.latitude !== null && event.longitude !== null) {
      const distance = getDistanceKm(
        input.location.latitude,
        input.location.longitude,
        event.latitude,
        event.longitude
      );
      const distanceFactor = Math.max(0, 1 - distance / input.location.radiusKm);
      eventImpact += (event.estimatedAttendance / 50000) * 30 * distanceFactor;
    } else {
      eventImpact += (event.estimatedAttendance / 50000) * 20;
    }

    // Venue capacity bonus
    const venue = input.venues.find((v) => v.name === event.venue);
    if (venue) {
      const capacityFactor = Math.min(1, venue.capacity / 60000);
      eventImpact += capacityFactor * 5;
    }

    if (eventImpact > 0.5) {
      factors.push({
        name: event.title,
        description: `${event.title} at ${event.venue} (~${event.estimatedAttendance.toLocaleString()} attendees)`,
        impact: Math.round(eventImpact),
      });
    }

    eventScore += eventImpact;
  }

  eventScore = clamp(eventScore, 0, MAX_EVENT_SCORE);
  totalScore += eventScore;

  // 2. Holiday bonus
  let holidayBonus = 0;
  for (const holiday of input.holidays) {
    holidayBonus += holiday.impactScore * 10;
    factors.push({
      name: holiday.name,
      description: `${holiday.name} (${holiday.type})`,
      impact: Math.round(holiday.impactScore * 10),
    });
  }

  // 3. Weather multiplier (0.4 to 1.15 range on multiplier portion)
  let weatherMultiplier = 1.0;
  if (input.weather) {
    weatherMultiplier = input.weather.multiplier;
    factors.push({
      name: 'Weather',
      description: `${input.weather.condition} (${input.weather.temperature}°C) — ${weatherMultiplier}x multiplier`,
      impact: Math.round((weatherMultiplier - 1) * 20),
    });
  }

  // 4. Weekend/holiday multiplier
  factors.push({
    name: 'Day of Week',
    description: `Weekday multiplier: ${input.weekdayMultiplier}x`,
    impact: Math.round((input.weekdayMultiplier - 1) * 20),
  });

  // 5. Tourism multiplier
  factors.push({
    name: 'Tourism Season',
    description: `Tourism multiplier: ${input.tourismMultiplier}x`,
    impact: Math.round((input.tourismMultiplier - 1) * 20),
  });

  const multiplierPortion = MAX_MULTIPLIER_SCORE * input.weekdayMultiplier * input.tourismMultiplier * weatherMultiplier;
  totalScore += Math.min(MAX_MULTIPLIER_SCORE, multiplierPortion);

  // Final score (0-100)
  const finalScore = clamp(Math.round(totalScore), 0, 100);

  let level: DayScore['level'];
  if (finalScore >= 80) level = 'Extreme';
  else if (finalScore >= 60) level = 'High';
  else if (finalScore >= 30) level = 'Moderate';
  else level = 'Low';

  return {
    date: input.date.toISOString().split('T')[0],
    score: finalScore,
    level,
    contributingFactors: factors,
    weather: input.weather,
    events: input.events,
    holidays: input.holidays,
  };
}

export function computeScoresForDateRange(
  startDate: Date,
  endDate: Date,
  baseInput: Omit<ScoreInput, 'date'>
): DayScore[] {
  const scores: DayScore[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayInput: ScoreInput = {
      ...baseInput,
      date: new Date(current),
      events: baseInput.events.filter(
        (e) => e.date === current.toISOString().split('T')[0]
      ),
      holidays: baseInput.holidays.filter(
        (h) => h.date === current.toISOString().split('T')[0]
      ),
    };
    scores.push(computeCrowdScore(dayInput));
    current.setDate(current.getDate() + 1);
  }

  return scores;
}
