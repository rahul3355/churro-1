# Demand Surge Calendar

Predict churro demand at Baltic Market, Liverpool before you staff your stall.

[demandsurge.vercel.app](https://demandsurge.vercel.app)

[![Next.js 14](https://img.shields.io/badge/next.js-14-black?logo=next.js)](https://nextjs.org/) [![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

---

## Quick Start

```bash
git clone https://github.com/your-org/demand-surge-calendar.git
cd demand-surge-calendar
npm install
cp .env.example .env.local
npm run dev
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TICKETMASTER_API_KEY` | Yes | Ticketmaster Discovery API v2 key. [Get one here](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/). Without it, live event data is skipped. |

Weather data comes from Open-Meteo (free, no API key).

---

## Project Structure

```
├── app/
│   ├── page.tsx                  # Main calendar page
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # All styles
│   ├── docs/
│   │   └── page.tsx              # Methodology docs
│   └── api/
│       └── forecast/
│           └── route.ts          # Server-side forecast API
├── components/
│   ├── Calendar.tsx              # Monthly calendar grid
│   ├── DayModal.tsx              # Day detail modal
│   ├── ChurroIcon.tsx            # Hero SVG icon
│   └── WeatherIcon.tsx           # Weather SVGs
├── lib/
│   ├── scoring.ts                # Core scoring algorithm
│   ├── calendar.ts               # 30-day forecast generator
│   ├── dataLoader.ts             # Static data loading
│   ├── weather.ts                # Open-Meteo API client
│   ├── ticketmaster.ts           # Ticketmaster API client
│   ├── cache.ts                  # localStorage caching
│   └── types.ts                  # TypeScript interfaces
├── data/
│   ├── config.json               # Location, hours, closure dates
│   ├── venues.json               # 14 nearby venues
│   ├── holidays.json             # UK bank holidays
│   ├── recurring-events.json     # Weekly markets, monthly events
│   ├── annual-events.json        # Yearly festivals
│   ├── weather-multipliers.json  # WMO code multiplier map
│   ├── weekday-multipliers.json  # Day-of-week multipliers
│   └── tourism-seasonality.json  # Monthly tourism curves
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

The demand score (0-100) is built from three additive components:

```
S_final = clamp(round(S_base + S_events + S_holidays), 0, 100)
```

- **Base**: 30 × day-of-week × tourism season × weather multiplier. Factors in weekday multipliers, monthly tourism curves (compressed for indoor markets), and a churro-specific weather model peaking at 11°C drizzle.
- **Events** (capped at 50): Weighted by Haversine distance decay (σ = 1.5 km), category relevance, and Michaelis-Menten attendance saturation. Pulls from Ticketmaster API, 14 venue JSON files, and recurring/annual event data.
- **Holidays** (capped at 15): Bank holidays, cultural celebrations, and school holidays. Christmas and NYD force market closure.
- **Confidence**: Decays with forecast distance (weather) and source reliability (Ticketmaster > recurring > annual). Range = score ± 15 × (1 - confidence).

Full methodology, formulas, and citations at [`/docs`](https://your-app.vercel.app/docs).

---

## Deployment

Built for Vercel. Server-side forecasts are cached permanently at the edge (ISR); client-side uses `localStorage` with CDN as source of truth.

```bash
npm i -g vercel
vercel
vercel env add TICKETMASTER_API_KEY
```

Set `TICKETMASTER_API_KEY` in Vercel project settings (Settings → Environment Variables).

---

## Available Scripts

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm start          # Start production
npm test           # Run Jest tests
```

---

## Contributing

PRs welcome. Fork, branch, test (`npm test`), and open a PR with conventional commits.

---

## License

[MIT](./LICENSE)
