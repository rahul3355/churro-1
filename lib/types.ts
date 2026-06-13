export interface Venue {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  venueType: string;
}

export interface Holiday {
  date: string;
  name: string;
  type: string;
  impactScore: number;
  regions: string[];
}

export interface RecurringEvent {
  id: string;
  name: string;
  location: string;
  venueId: string | null;
  recurrenceRule: string;
  estimatedAttendance: number;
  impactScore: number;
  category: string;
}

export interface AnnualEvent {
  id: string;
  name: string;
  month: number;
  day: number | null;
  datePattern: string;
  venueId: string | null;
  attendanceEstimate: number;
  impactScore: number;
  durationDays: number;
  category: string;
  notes: string;
}

export interface NormalizedEvent {
  id: string;
  title: string;
  venue: string;
  date: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  estimatedAttendance: number;
  source: string;
}

export interface DayScore {
  date: string;
  score: number;
  level: 'Low' | 'Moderate' | 'High' | 'Extreme';
  contributingFactors: ContributingFactor[];
  weather: WeatherInfo | null;
  events: NormalizedEvent[];
  holidays: Holiday[];
}

export interface ContributingFactor {
  name: string;
  description: string;
  impact: number;
}

export interface WeatherInfo {
  condition: string;
  temperature: number;
  weatherCode: number;
  multiplier: number;
}

export interface WeatherMultipliers {
  multipliers: Record<string, number>;
  weatherCodeMap: Record<string, string>;
}

export interface WeekdayMultipliers {
  multipliers: Record<string, number>;
}

export interface TourismSeasonality {
  monthlyMultipliers: Record<string, number>;
  monthNames: Record<string, string>;
}

export interface Location {
  name: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export interface ScoreInput {
  date: Date;
  location: Location;
  events: NormalizedEvent[];
  weather: WeatherInfo | null;
  holidays: Holiday[];
  tourismMultiplier: number;
  weekdayMultiplier: number;
  venues: Venue[];
}
