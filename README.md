<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./public/churro-image.svg">
    <img alt="Demand Surge Calendar" src="./public/churro-image.svg" width="64">
  </picture>
</p>
<h1 align="center">Demand Surge Calendar</h1>
<p align="center">
  A lightweight demand forecasting tool for food stall operators at Baltic Market, Liverpool.
  <br />
  Predict churro demand before you staff your stall.
</p>

<p align="center">
  <a href="https://github.com/rahulrocksamb/demand-surge-calendar/actions"><img src="https://img.shields.io/github/actions/workflow/status/rahulrocksamb/demand-surge-calendar/ci.yml?branch=main&label=ci" alt="CI"></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/next.js-14-black?logo=next.js" alt="Next.js 14"></a>
  <a href="https://vercel.com/"><img src="https://img.shields.io/badge/deployed%20on-vercel-black?logo=vercel" alt="Deployed on Vercel"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License: MIT"></a>
</p>

---

## What It Does

Shows a color-coded monthly calendar that predicts daily demand on a **0–100 scale** for a food stall at Baltic Market, Liverpool. Each day is binned into one of six levels:

| Level | Score Range | What It Means |
|---|---|---|
| **Closed** | 0 | Market not operating (Mon–Wed, Christmas, NYD) |
| **Quiet** | 1–15 | One staff member, easy shift |
| **Steady** | 16–35 | One staff member, steady trade |
| **Busy** | 36–60 | Two staff members recommended |
| **Very Busy** | 61–80 | Three staff members recommended |
| **Crush** | 81–100 | All hands, prep double batches |

Click any day to open a detailed modal showing the score, confidence range, weather forecast, nearby events, contributing multipliers, and a full score breakdown.

A [`/docs`](https://your-app.vercel.app/docs) page walks through the entire methodology with formulas, assumptions, and external references.

---

## Who It's For

Food stall operators, market traders, and event vendors who sell from a fixed indoor location and want data-driven demand forecasts instead of gut-feel staffing. Built for Baltic Market, Liverpool, but the scoring engine and data pipeline can be adapted to any venue with static event data and weather.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router) |
| **Language** | TypeScript |
| **Styling** | CSS Modules via `app/globals.css` |
| **Fonts** | Inter + JetBrains Mono (next/font) |
| **Weather** | [Open-Meteo](https://open-meteo.com/) (no API key) |
| **Live Events** | [Ticketmaster Discovery API v2](https://developer.ticketmaster.com/) |
| **Static Data** | JSON files in `data/` (venues, holidays, recurring events) |
| **Caching** | Vercel Edge (permanent ISR) + client-side `localStorage` |
| **Testing** | [Jest 29](https://jestjs.io/) + ts-jest |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/your-org/demand-surge-calendar.git
cd demand-surge-calendar

# Install dependencies
npm install

# Copy environment file and add your Ticketmaster key
cp .env.example .env.local

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the calendar.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TICKETMASTER_API_KEY` | Yes | Ticketmaster Discovery API v2 key. Get one at [developer.ticketmaster.com](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/). Without it, live event data is skipped and the app falls back to static events only. |

Place these in `.env.local` (gitignored). See `.env.example` for the template.

Weather data comes from Open-Meteo, which is free, open, and requires no API key.

---

## Project Structure

```
├── app/
│   ├── page.tsx                  # Main calendar page with hero
│   ├── layout.tsx                # Root layout (Inter + JetBrains Mono)
│   ├── globals.css               # All styles
│   ├── docs/
│   │   └── page.tsx              # Methodology documentation page
│   └── api/
│       └── forecast/
│           └── route.ts          # Server-side forecast API (cached permanently)
├── components/
│   ├── Calendar.tsx              # Monthly calendar grid with client-side caching
│   ├── DayModal.tsx              # Day detail modal (score, weather, breakdown)
│   ├── ChurroIcon.tsx            # Hero SVG icon
│   └── WeatherIcon.tsx           # Animated WMO weather SVGs (sun, cloud, rain, etc.)
├── lib/
│   ├── scoring.ts                # Core scoring algorithm
│   ├── calendar.ts               # 30-day forecast generator (orchestrator)
│   ├── dataLoader.ts             # Static JSON data loading + event resolution
│   ├── weather.ts                # Open-Meteo API client
│   ├── ticketmaster.ts           # Ticketmaster Discovery API client
│   ├── cache.ts                  # localStorage caching utilities
│   └── types.ts                  # TypeScript interfaces
├── data/
│   ├── config.json               # Location, hours, closure dates
│   ├── venues.json               # 14 venues within walking distance of Baltic Market
│   ├── holidays.json             # UK bank holidays + cultural celebrations
│   ├── recurring-events.json     # Weekly markets, monthly events
│   ├── annual-events.json        # Yearly festivals with date patterns
│   ├── weather-multipliers.json  # WMO code → condition → multiplier map
│   ├── weekday-multipliers.json  # Day-of-week demand multipliers
│   └── tourism-seasonality.json  # Monthly tourism curves for Liverpool
├── __tests__/
│   ├── scoring.test.ts
│   ├── dataLoader.test.ts
│   ├── weather.test.ts
│   └── ticketmaster.test.ts
├── public/
│   └── churro-image.svg
├── next.config.js
├── tsconfig.json
├── package.json
└── .env.example
```

---

## How Scoring Works

The demand score (`0`–`100`) is computed from three additive components:

```
S_final = clamp(round(S_base + S_events + S_holidays), 0, 100)
```

### Base Multiplier
`30 × dayMultiplier × tourismMultiplier × weatherMultiplier`

Captures organic daily demand. The base score of 30 represents an average open day with neutral multipliers.

| Multiplier | Source | Notes |
|---|---|---|
| **Day of week** | `data/weekday-multipliers.json` | Saturday = 1.30x, Thursday = 0.55x, Mon–Tue = 0 |
| **Tourism season** | `data/tourism-seasonality.json` | Compressed toward 1.0 (indoor market insulation) |
| **Weather** | Open-Meteo → churro-specific model | Peak at 11°C drizzle; penalty above 24°C heat |

### Event Contribution (capped at 50 points)

Each event is weighed by three factors:

- **Gaussian distance decay** from Baltic Market (`σ = 1.5 km`) using the Haversine formula
- **Category relevance** — market 1.00, music 0.70, sports 0.25, etc.
- **Michaelis-Menten saturation** — diminishing returns per-event, half-saturation at 3,000 effective attendees

```
impact = 18 × (attendance × decay × relevance) / (attendance × decay × relevance + 3000)
```

Events over 50,000 attendees within 3 km get a 1.15× impulse multiplier.

### Holiday Boost (capped at 15 points)

```
H = Σ(impactScore × typeWeight × 12)

typeWeight: {bank-holiday: 0.70, cultural: 0.50, school-holiday: 0.80}
```

Christmas Day and New Year's Day force a market closure override.

### Confidence

Forecasts include a confidence score (0.0–1.0) and a score range:

```
C_weather = max(0.30, 1 − 0.05 × days_ahead)
C_event = min(source): {ticketmaster: 0.95, recurring: 0.85, annual: 0.60}
C = (C_weather + C_event) / 2

range = [score ± 15 × (1 − C)]
```

See [`/docs`](https://your-app.vercel.app/docs) for the full methodology with formulas, assumptions, and citations.

---

## Data Sources

| Source | What | Refresh |
|---|---|---|
| [Open-Meteo](https://open-meteo.com/) | 16-day forecast + 92-day historical weather | Real-time per request |
| [Ticketmaster Discovery API v2](https://developer.ticketmaster.com/) | Live events within 2 km | Cached permanently (ISR) |
| `data/holidays.json` | UK bank holidays + cultural celebrations | Static, updated annually |
| `data/venues.json` | 14 venues with capacity, coordinates, churro weights | Static |
| `data/recurring-events.json` | Weekly markets, monthly first-Saturday events | Static |
| `data/annual-events.json` | Yearly festivals with date patterns | Static |
| `data/tourism-seasonality.json` | Monthly tourism curves | Static, based on Visit Liverpool data |

---

## Caching Strategy

- **Server-side**: The `/api/forecast` route returns `Cache-Control: public, max-age=31536000, immutable`. Vercel's edge CDN caches each month's forecast permanently. Weather data uses `{ next: { revalidate: false } }` (permanent ISR). New forecasts are generated only for months not yet cached.
- **Client-side**: `localStorage` caches API responses and weather data keyed by coordinates + date range. No TTL — the CDN cache acts as the source of truth. A "refresh forecast" button re-fetches from the API.

---

## Deployment (Vercel)

The app is built for Vercel. Deploy in one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-org%2Fdemand-surge-calendar&env=TICKETMASTER_API_KEY)

Or manually:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variable
vercel env add TICKETMASTER_API_KEY
```

Make sure to set `TICKETMASTER_API_KEY` in your Vercel project settings (**Settings → Environment Variables**).

---

## Available Scripts

```bash
npm run dev        # Start development server (localhost:3000)
npm run build      # Production build
npm start          # Start production server
npm test           # Run Jest test suite
npm run test:watch # Run tests in watch mode
```

---

## Contributing

Contributions are welcome. To get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes and write tests (`npm test`)
4. Commit using [conventional commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, etc.)
5. Push and open a pull request

Areas that could use contributions:

- **POS data integration**: Replace heuristic attendance estimates with real sales data
- **Additional venues**: Add support for other food markets or stalls
- **Bank holiday Mondays**: Currently score 0 (market closed), but some bank holiday Mondays could operate
- **Holiday spillover**: Model demand effects on adjacent days
- **i18n**: Support for non-English markets

For bugs, feature requests, or questions, please [open an issue](https://github.com/your-org/demand-surge-calendar/issues).

---

## License

[MIT](./LICENSE) © 2025–2026
