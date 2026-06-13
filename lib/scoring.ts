import type {
  NormalizedEvent,
  DayScore,
  ContributingFactor,
  WeatherInfo,
  Holiday,
  Venue,
  ScoreInput,
  Location,
} from './types';

// ============================================================================
// CONSTANTS — calibrated for Baltic Market churro stall
// ============================================================================
const BALTIC_LAT = 53.3934;
const BALTIC_LON = -2.9851;
const BALTIC_CAP = 2000;

const SIGMA = 1.5;                      // Gaussian distance-decay sigma (km)
const EVENT_HALF_SAT = 3000;            // Michaelis-Menten half-saturation
const EVENT_MAX_PER = 18;               // Max contribution from any single event
const EVENT_CAP = 50;                   // Total event component cap (0-50 points)
const HOLIDAY_CAP = 15;                 // Total holiday component cap (0-15 points)
const BASE_SCORE = 30;                  // Baseline churro demand on an "average" open day
const BIG_EVENT_THRESHOLD = 50000;      // Attendance threshold for "big event" impulse multiplier

// ============================================================================
// HAVERSINE DISTANCE
// ============================================================================
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

// ============================================================================
// GAUSSIAN DISTANCE DECAY (replaces linear decay)
// ============================================================================
function gaussianDecay(distanceKm: number | null): number {
  if (distanceKm === null) return 0.35; // Unlocated events: moderate default
  return Math.exp(-(distanceKm * distanceKm) / (2 * SIGMA * SIGMA));
}

// ============================================================================
// EVENT CATEGORY RELEVANCE (P(buys churro | event type))
// ============================================================================
function categoryRelevance(category: string): number {
  const map: Record<string, number> = {
    'market':     1.00,
    'music':      0.70,
    'pride':      0.70,
    'shopping':   0.65,
    'arts':       0.60,
    'family':     0.55,
    'convention': 0.40,
    'film':       0.35,
    'sports':     0.25,
  };
  return map[category] ?? 0.40;
}

// ============================================================================
// OPERATING GATE
// ============================================================================
function isOperating(date: Date, holidays: Holiday[]): boolean {
  const dow = date.getDay(); // 0=Sun, 4=Thu, 5=Fri, 6=Sat
  // Closed Mon (1), Tue (2)
  if (dow === 1 || dow === 2) return false;

  // Check for forced closure holidays
  for (const h of holidays) {
    if (h.name === 'Christmas Day' || h.name === "New Year's Day") {
      return false;
    }
  }
  return true;
}

// ============================================================================
// CHURRO-SPECIFIC WEATHER MULTIPLIER (inverted U-curve)
// ============================================================================
function churroWeatherMultiplier(weather: WeatherInfo | null): number {
  if (!weather) return 1.0;

  const temp = weather.temperature;
  const wmo = weather.weatherCode;

  // Component A: Temperature Appeal — peak at 11degC
  const tempFactor = clamp(1.0 - ((temp - 11) / 20) ** 2, 0.40, 1.20);

  // Component B: Precipitation Modifier — rain drives people indoors for comfort food
  let precipModifier = 1.0;
  if (wmo === 0 || wmo === 1) {
    precipModifier = 0.95;       // Clear/sunny: slight negative
  } else if (wmo === 2 || wmo === 3) {
    precipModifier = 1.05;       // Overcast: slight positive
  } else if (wmo >= 51 && wmo <= 55) {
    precipModifier = 1.15;       // Drizzle: peak comfort food trigger
  } else if (wmo === 61 || wmo === 63 || wmo === 80 || wmo === 81) {
    precipModifier = 1.08;       // Rain: good boost
  } else if (wmo === 65 || wmo === 82) {
    precipModifier = 0.85;       // Heavy rain: travel deterrent
  } else if (wmo === 95 || wmo === 96 || wmo === 99) {
    precipModifier = 0.50;       // Thunderstorm: stay home
  } else if (wmo === 45 || wmo === 48) {
    precipModifier = 0.90;       // Fog
  } else if (wmo >= 71 && wmo <= 75) {
    precipModifier = 0.70;       // Snow: disruption
  } else {
    precipModifier = 1.0;
  }

  // Component C: Heat Penalty (sigmoid above 24degC)
  let heatPenalty = 1.0;
  if (temp > 24) {
    const excess = temp - 24;
    heatPenalty = 1.0 / (1.0 + 0.05 * excess);
  }

  return clamp(tempFactor * precipModifier * heatPenalty, 0.30, 1.40);
}

// ============================================================================
// CHURRO TOURISM MULTIPLIER (compressed toward 1.0 for indoor market)
// ============================================================================
function churroTourismMultiplier(rawTourismMult: number): number {
  return 1.0 + 0.5 * (rawTourismMult - 1.0);
}

// ============================================================================
// CHURRO DAY MULTIPLIER (Baltic Market operating calendar)
// ============================================================================
function churroDayMultiplier(dayOfWeek: number): number {
  const map: Record<number, number> = {
    3: 0.55,    // Wednesday: same hours as Thursday
    4: 0.55,    // Thursday
    5: 0.80,    // Friday: heavy evening trade
    6: 1.30,    // Saturday: full day peak
    0: 0.95,    // Sunday: full day, gentler close
  };
  return map[dayOfWeek] ?? 0;
}

// ============================================================================
// EVENT CONTRIBUTION (saturated sum via Michaelis-Menten)
// ============================================================================
function eventContribution(events: NormalizedEvent[]): number {
  let total = 0;
  for (const event of events) {
    let d: number | null = null;
    if (event.latitude !== null && event.longitude !== null) {
      d = getDistanceKm(event.latitude, event.longitude, BALTIC_LAT, BALTIC_LON);
    }
    const decay = gaussianDecay(d);
    const relevance = categoryRelevance(event.category);
    const effectiveDraw = event.estimatedAttendance * decay * relevance;
    let saturatedImpact = EVENT_MAX_PER * effectiveDraw / (effectiveDraw + EVENT_HALF_SAT);

    // Big-event impulse multiplier
    if (event.estimatedAttendance >= BIG_EVENT_THRESHOLD && d !== null && d <= 3.0) {
      saturatedImpact *= 1.15;
    }
    total += saturatedImpact;
  }
  return clamp(total, 0, EVENT_CAP);
}

// ============================================================================
// HOLIDAY BOOST (churro-type-weighted)
// ============================================================================
function holidayBoost(holidays: Holiday[]): number {
  const typeWeight: Record<string, number> = {
    'bank-holiday':   0.70,
    'cultural':       0.50,
    'school-holiday': 0.80,
  };
  let total = 0;
  for (const h of holidays) {
    const weight = typeWeight[h.type] ?? 0.40;
    total += h.impactScore * weight * 12;
  }
  return clamp(total, 0, HOLIDAY_CAP);
}

// ============================================================================
// CONFIDENCE MODEL
// ============================================================================
function computeConfidence(date: Date, events: NormalizedEvent[], daysAhead: number): number {
  // Weather confidence decays with forecast horizon
  const weatherConf = Math.max(0.30, 1.0 - 0.05 * daysAhead);

  // Event confidence varies by source
  let eventConf = 1.0;
  for (const event of events) {
    if (event.source === 'ticketmaster') {
      eventConf = Math.min(eventConf, 0.95);
    } else if (event.source === 'annual') {
      eventConf = Math.min(eventConf, 0.60);
    } else if (event.source === 'recurring') {
      eventConf = Math.min(eventConf, 0.85);
    }
  }

  return clamp((weatherConf + eventConf) / 2.0, 0.0, 1.0);
}

// ============================================================================
// SCORE TO LEVEL BINNING
// ============================================================================
function scoreToLevel(score: number): DayScore['level'] {
  if (score === 0) return 'Closed';
  if (score <= 15) return 'Quiet';
  if (score <= 35) return 'Steady';
  if (score <= 60) return 'Busy';
  if (score <= 80) return 'Very Busy';
  return 'Crush';
}

// ============================================================================
// MAIN: computeCrowdScore — CHURRO-SPECIFIC
// ============================================================================
export function computeCrowdScore(input: ScoreInput): DayScore {
  const factors: ContributingFactor[] = [];

  // Step 0: Operating gate
  if (!isOperating(input.date, input.holidays)) {
    return {
      date: input.date.toISOString().split('T')[0],
      score: 0,
      level: 'Closed',
      confidence: 1.0,
      scoreRange: [0, 0],
      contributingFactors: [{
        name: 'Market Closed',
        description: 'Baltic Market is not operating today (Mon-Tue or major holiday closure)',
        impact: 0,
      }],
      weather: input.weather,
      events: input.events,
      holidays: input.holidays,
    };
  }

  // Step 1: Event contribution
  const S_events = eventContribution(input.events);
  if (S_events > 0.5) {
    factors.push({
      name: 'Events',
      description: `Events driving ${Math.round(S_events)} points of churro demand`,
      impact: Math.round(S_events),
    });
  }

  // Step 2: Holiday boost
  const S_holiday = holidayBoost(input.holidays);
  for (const holiday of input.holidays) {
    const typeWeight: Record<string, number> = {
      'bank-holiday': 0.70, 'cultural': 0.50, 'school-holiday': 0.80,
    };
    factors.push({
      name: holiday.name,
      description: `${holiday.name} (${holiday.type})`,
      impact: Math.round(holiday.impactScore * (typeWeight[holiday.type] ?? 0.40) * 12),
    });
  }

  // Step 3: Multipliers
  const w_day = churroDayMultiplier(input.date.getDay());
  const w_tourism = churroTourismMultiplier(input.tourismMultiplier);
  const w_weather = churroWeatherMultiplier(input.weather);

  factors.push({
    name: 'Day of Week',
    description: `Baltic Market day multiplier: ${w_day.toFixed(2)}x`,
    impact: Math.round((w_day - 1) * 20),
  });

  factors.push({
    name: 'Tourism Season',
    description: `Tourism multiplier: ${w_tourism.toFixed(2)}x`,
    impact: Math.round((w_tourism - 1) * 20),
  });

  if (input.weather) {
    factors.push({
      name: 'Weather',
      description: `${input.weather.condition} (${input.weather.temperature}°C) — ${w_weather.toFixed(2)}x churro multiplier`,
      impact: Math.round((w_weather - 1) * 20),
    });
  }

  // Step 4: Assemble final score
  const baseMultiplier = BASE_SCORE * w_day * w_tourism * w_weather;
  const S_raw = baseMultiplier + S_events + S_holiday;
  const S_final = clamp(Math.round(S_raw), 0, 100);

  // Step 5: Confidence
  const today = new Date();
  const daysAhead = Math.max(0, Math.floor((input.date.getTime() - today.getTime()) / 86400000));
  const confidence = computeConfidence(input.date, input.events, daysAhead);

  const margin = Math.round(15 * (1 - confidence));
  const scoreRange: [number, number] = [
    Math.max(0, S_final - margin),
    Math.min(100, S_final + margin),
  ];

  const level = scoreToLevel(S_final);

  return {
    date: input.date.toISOString().split('T')[0],
    score: S_final,
    level,
    confidence: Math.round(confidence * 100) / 100,
    scoreRange,
    contributingFactors: factors,
    weather: input.weather,
    events: input.events,
    holidays: input.holidays,
  };
}

// ============================================================================
// computeScoresForDateRange (same logic, uses computeCrowdScore)
// ============================================================================
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
