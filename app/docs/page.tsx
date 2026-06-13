'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';

const SECTIONS = [
  { id: 'events', num: 1, title: 'Events' },
  { id: 'weather', num: 2, title: 'Weather' },
  { id: 'day-of-week', num: 3, title: 'Day of Week' },
  { id: 'tourism', num: 4, title: 'Tourism Seasonality' },
  { id: 'holidays', num: 5, title: 'Holidays' },
  { id: 'distance', num: 6, title: 'Distance Decay' },
  { id: 'venue', num: 7, title: 'Venue Proximity' },
  { id: 'score-assembly', num: 8, title: 'Score Assembly' },
  { id: 'confidence', num: 9, title: 'Confidence' },
];

function tokenize(code: string) {
  const tokens: Array<{ text: string; type: string }> = [];
  let remaining = code;

  while (remaining.length > 0) {
    const strMatch = remaining.match(/^(['"])(?:\\.|[^\\])*?\1/);
    if (strMatch) {
      tokens.push({ text: strMatch[0], type: 'string' });
      remaining = remaining.slice(strMatch[0].length);
      continue;
    }
    const commentMatch = remaining.match(/^(#.*)/);
    if (commentMatch) {
      tokens.push({ text: commentMatch[0], type: 'comment' });
      remaining = remaining.slice(commentMatch[0].length);
      continue;
    }
    const decoratorMatch = remaining.match(/^(@\w+)/);
    if (decoratorMatch) {
      tokens.push({ text: decoratorMatch[0], type: 'decorator' });
      remaining = remaining.slice(decoratorMatch[0].length);
      continue;
    }
    const keywordMatch = remaining.match(/^(def|return|if|else|elif|for|in|import|from|as|class|while|try|except|raise|with|pass|break|continue|yield|lambda|and|or|not|is)\b/);
    if (keywordMatch) {
      tokens.push({ text: keywordMatch[0], type: 'keyword' });
      remaining = remaining.slice(keywordMatch[0].length);
      continue;
    }
    const noneMatch = remaining.match(/^(None|True|False)\b/);
    if (noneMatch) {
      tokens.push({ text: noneMatch[0], type: 'constant' });
      remaining = remaining.slice(noneMatch[0].length);
      continue;
    }
    const builtinMatch = remaining.match(/^(print|len|range|int|float|str|list|dict|set|tuple|bool|sum|min|max|abs|round|enumerate|zip|map|filter|sorted|reversed|any|all|isinstance|type|open|input|math|exp|sqrt|atan2|sin|cos|pi|clamp|haversine)\b/);
    if (builtinMatch) {
      tokens.push({ text: builtinMatch[0], type: 'builtin' });
      remaining = remaining.slice(builtinMatch[0].length);
      continue;
    }
    const numberMatch = remaining.match(/^(\d+(?:\.\d+)?)/);
    if (numberMatch) {
      tokens.push({ text: numberMatch[0], type: 'number' });
      remaining = remaining.slice(numberMatch[0].length);
      continue;
    }
    tokens.push({ text: remaining[0], type: 'text' });
    remaining = remaining.slice(1);
  }

  return tokens;
}

function PythonBlock({ children }: { children: string }) {
  const html = useMemo(() => {
    const tokens = tokenize(children);
    return tokens.map((t, i) =>
      `<span class="py-${t.type}">${t.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>`
    ).join('');
  }, [children]);

  return (
    <pre className="docs-code"><code dangerouslySetInnerHTML={{ __html: html }} /></pre>
  );
}

function Section({ id, num, title, children }: { id: string; num: number; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="docs-section">
      <h2 className="docs-section-title">
        <span className="docs-section-num">{num}.</span> {title}
      </h2>
      <div className="docs-section-body">{children}</div>
    </section>
  );
}

function HighlightBox({ children }: { children: React.ReactNode }) {
  return <div className="docs-highlight">{children}</div>;
}

export default function DocsPage() {
  const [active, setActive] = useState(SECTIONS[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    observer.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );

    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    for (const el of els) observer.current.observe(el);

    return () => observer.current?.disconnect();
  }, []);

  return (
    <div className="docs-layout">
      <div className={`docs-sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`docs-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="docs-sidebar-inner">
          <Link href="/" className="docs-sidebar-home">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: 6 }}>
              <path d="M3 8L7 4L11 8M5 6.5V12H9V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            back to calendar
          </Link>

          <nav className="docs-sidebar-nav" aria-label="Documentation sections">
            <div className="docs-sidebar-label">contents</div>
            <ul>
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={active === s.id ? 'active' : ''}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' });
                      setSidebarOpen(false);
                    }}
                  >
                    {s.num}. {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      <main className="docs-content">
        <div className="docs-mobile-header">
          <Link href="/" className="docs-back-link">back to calendar</Link>
          <button className="docs-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <header className="docs-hero">
          <div className="docs-hero-inner">
            <h1 className="docs-hero-title">How Churro Demand Is Calculated</h1>
            <p className="docs-hero-subtitle">
              Every day, the system analyses events, weather, tourism patterns, and more to predict how many churros you will sell at Baltic Market, Liverpool. Here is exactly how each piece works.
            </p>
          </div>
        </header>

        <div className="docs-hero-inner">
          <div className="docs-divider" />

          <Section id="events" num={1} title="Events">
            <p>Every event in Liverpool within the effective radius of Baltic Market contributes to the churro demand score. The system pulls from three sources: annual festivals, recurring weekly markets, and live Ticketmaster events.</p>
            <HighlightBox>
              <strong>Example.</strong> Liverpool Sound City at Baltic Market (30,000 attendees, music category) adds significant demand. A football match at Anfield (54,000 attendees, sports category) adds essentially nothing because it is 4.5km away and football fans buy pies, not churros.
            </HighlightBox>
            <h3>How it works</h3>
            <p>Events are weighted by three factors: how close they are to Baltic Market (Gaussian distance decay, sigma 1.5km), how likely attendees are to buy churros (category relevance: market 1.00, music 0.70, sports 0.25), and diminishing returns from venue capacity (Michaelis-Menten saturation, half-saturation at 3,000 effective attendees). Each event is capped at 18 points and total event contribution is capped at 50 points.</p>
            <h3>Assumptions</h3>
            <ol className="docs-assumptions">
              <li>Baltic Market is the geographic centre (53.3934, -2.9851) with a 1.8km effective radius.</li>
              <li>Category relevance scores are prior estimates of the probability that an attendee buys a churro, and would improve with real POS data.</li>
              <li>Event attendance figures from annual events are best-guess estimates from Liverpool tourism data.</li>
              <li>Ticketmaster attendance is heuristically estimated from venue name matching with churro conversion weights per venue.</li>
              <li>Recurring events follow fixed weekly or monthly patterns that may shift on bank holidays.</li>
              <li>Events beyond 3km contribute less than 14 percent due to Gaussian decay.</li>
              <li>Events with over 50,000 estimated attendance within 3km receive a 1.15x impulse multiplier for festival atmosphere.</li>
            </ol>
            <h3>Formula</h3>
            <PythonBlock>{`impact = 18 × draw / (draw + 3000)

draw = attendance × e^(-distance² / 4.5) × relevance

relevance ∈ {market: 1.0, music: 0.7, sports: 0.25}`}</PythonBlock>
            <p className="docs-links">
              <a href="https://en.wikipedia.org/wiki/Haversine_formula" target="_blank">Haversine formula on Wikipedia</a>
              <span className="docs-link-sep">|</span>
              <a href="https://en.wikipedia.org/wiki/Michaelis%E2%80%93Menten_kinetics" target="_blank">Michaelis-Menten kinetics on Wikipedia</a>
            </p>
          </Section>

          <Section id="weather" num={2} title="Weather">
            <p>Weather is the most counterintuitive parameter. Unlike general footfall where sun is good and rain is bad, churro sales peak in cool, drizzly conditions. The system fetches 16-day forecasts from Open-Meteo and runs each day through a three-component weather model.</p>
            <HighlightBox>
              <strong>Example.</strong> A drizzly day at 10 degrees C gets a strong weather multiplier because people seek covered markets and warm comfort food. A sunny day at 28 degrees C gets a poor multiplier because people buy ice cream, not hot fried dough.
            </HighlightBox>
            <h3>How it works</h3>
            <p>The churro weather multiplier combines three sub-models. A parabolic temperature curve peaks at 11 degrees C, the optimal crisp weather for hot fried dough. A precipitation modifier inverts the typical rain penalty: drizzle boosts demand by 15 percent, light rain by 8 percent, while thunderstorms slash demand to 50 percent. A sigmoid heat penalty activates above 24 degrees C, progressively suppressing demand as temperatures rise. The three components multiply together and are clamped between 0.30 and 1.40.</p>
            <h3>Assumptions</h3>
            <ol className="docs-assumptions">
              <li>11 degrees C is the optimal churro-buying temperature based on comfort food psychology.</li>
              <li>Baltic Market is a covered indoor venue so rain does not close operations.</li>
              <li>The temperature curve is parabolic: 1.0 minus ((T minus 11) over 20) squared, clamped to 0.40 through 1.20.</li>
              <li>WMO weather codes from Open-Meteo map to 14 condition labels via a static lookup table.</li>
              <li>The heat penalty sigmoid uses a 0.05 coefficient per degree above 24 degrees C.</li>
              <li>Storm and thunderstorm conditions (WMO 95 through 99) may cause the market to reduce hours or close.</li>
              <li>Snow in Liverpool is rare but when it occurs it significantly boosts churro demand through comfort food psychology.</li>
            </ol>
            <h3>Formula</h3>
            <PythonBlock>{`T' = clamp(1 - ((T - 11) / 20)², 0.40, 1.20)

H = 1                        if T ≤ 24
  = 1 / (1 + 0.05(T - 24))   if T > 24

P = {drizzle: 1.15, rain: 1.08, storm: 0.50, snow: 0.70}

W = clamp(T' × P × H, 0.30, 1.40)`}</PythonBlock>
            <p className="docs-links">
              <a href="https://open-meteo.com/" target="_blank">Open-Meteo API</a>
              <span className="docs-link-sep">|</span>
              <a href="https://www.nodc.noaa.gov/archive/arc0021/0002199/1.1/data/0-data/HTML/WMO-CODE/WMO4677.HTM" target="_blank">WMO weather codes reference</a>
            </p>
          </Section>

          <Section id="day-of-week" num={3} title="Day of Week">
            <p>Baltic Market operates Thursday through Sunday. The day-of-week multiplier reflects actual trading patterns rather than general high street footfall.</p>
            <HighlightBox>
              <strong>Example.</strong> A Saturday gets 1.30x (full day peak trading, lunch through evening). A Thursday gets 0.55x (evening-only service). Monday, Tuesday, and Wednesday are non-operating days and return a score of zero with a "Closed" level regardless of other factors.
            </HighlightBox>
            <h3>How it works</h3>
            <p>The scoring engine first checks if Baltic Market is open on a given day. Monday through Wednesday always return a score of 0. For operating days, the multiplier is applied to the base score: Thursday 0.55x, Friday 0.80x, Saturday 1.30x, Sunday 0.95x. The Saturday peak reflects all-day service with lunch, afternoon snack, and evening dinner windows.</p>
            <h3>Assumptions</h3>
            <ol className="docs-assumptions">
              <li>Baltic Market operating hours: Thu-Fri 5pm through 11pm, Sat 12pm through 11pm, Sun 12pm through 9pm.</li>
              <li>Monday through Wednesday are always closed with no exceptions.</li>
              <li>Bank holiday Mondays currently also score 0, which is a known future improvement area.</li>
              <li>The multipliers are calibrated against food vendor revenue patterns, not general footfall.</li>
              <li>Friday gets 0.80x despite being evening-only because weekend anticipation drives higher per-hour spend.</li>
            </ol>
            <h3>Formula</h3>
            <PythonBlock>{`D = lookup[dow]

  Sunday    = 0.95
  Thursday  = 0.55
  Friday    = 0.80
  Saturday  = 1.30
  Mon-Wed   = 0`}</PythonBlock>
          </Section>

          <Section id="tourism" num={4} title="Tourism Seasonality">
            <p>Liverpool tourism ebbs and flows with the seasons, but an indoor food market is partially insulated from weather. The tourism multiplier is compressed toward 1.0, with summer months amplified for food context.</p>
            <HighlightBox>
              <strong>Example.</strong> August (peak tourism and school holidays) gets 1.23x after compression. January (post-holiday austerity and diet resolutions) gets 0.78x after compression from the raw 0.55.
            </HighlightBox>
            <h3>How it works</h3>
            <p>The system loads monthly base multipliers from a 12-month lookup table, then applies a compression formula that pulls values toward 1.0 by 50 percent. This reflects that indoor venues have lower seasonal amplitude than outdoor attractions. Summer months are amplified compared to general tourism because tourists spend significantly more per capita on street food than locals. December is dampened because the Christmas Market at St George's Hall sells churros as a direct competitor.</p>
            <h3>Assumptions</h3>
            <ol className="docs-assumptions">
              <li>Indoor food markets have roughly half the seasonal amplitude of outdoor attractions.</li>
              <li>Tourists spend approximately 2 to 2.5 times more on street food per capita than locals.</li>
              <li>The Christmas Market at St George's Hall (1.7km away) is a direct churro competitor in December.</li>
              <li>January and February see additional suppression from New Year diet resolutions.</li>
              <li>Monthly multipliers are static and do not account for year-specific events or weather anomalies.</li>
            </ol>
            <h3>Formula</h3>
            <PythonBlock>{`T = 1 + 0.5 × (raw - 1)

raw ∈ {Jan: 0.55, Jun: 1.18, Aug: 1.45, Dec: 1.10}`}</PythonBlock>
            <p className="docs-links">
              <a href="https://www.visitliverpool.com/" target="_blank">Visit Liverpool tourism data</a>
            </p>
          </Section>

          <Section id="holidays" num={5} title="Holidays">
            <p>UK bank holidays and cultural celebrations affect churro demand differently than general crowd levels. Bank holidays mean people are off work and spending on leisure, which boosts food stall sales. Some holidays close the market entirely.</p>
            <HighlightBox>
              <strong>Example.</strong> Summer Bank Holiday (August) adds 8 points of churro demand as families and festival-goers flood the city. Christmas Day adds 0 points because Baltic Market is closed. Father's Day adds 4 points from family outings.
            </HighlightBox>
            <h3>How it works</h3>
            <p>Each holiday has an impact score (0.0 to 1.0) and a type: bank-holiday, cultural, or school-holiday. The type determines a weight: bank holidays get 0.70x, cultural events get 0.50x, and school holidays get 0.80x. The raw contribution is impactScore times typeWeight times 12, with total holiday contribution capped at 15 points. Christmas Day and New Year's Day force a market closure override, returning a score of 0 regardless of other factors.</p>
            <h3>Assumptions</h3>
            <ol className="docs-assumptions">
              <li>Bank holidays increase leisure spending but the effect varies by holiday type.</li>
              <li>Christmas Day and New Year's Day are forced closure days for Baltic Market.</li>
              <li>The impactScore values are calibrated for Liverpool's specific demographic patterns.</li>
              <li>Holiday effects do not spill over to adjacent days.</li>
              <li>St Patrick's Day in Liverpool gets heightened impact due to the city's large Irish population.</li>
              <li>Holiday scores are additive and capped at 15 points to prevent unrealistic accumulation.</li>
              <li>Only holidays tagged with the "england" region affect Liverpool scores.</li>
            </ol>
            <h3>Formula</h3>
            <PythonBlock>{`H = Σ (impact × weight × 12)

weight ∈ {bank-holiday: 0.70, cultural: 0.50, school-holiday: 0.80}

capped at 15 points`}</PythonBlock>
            <p className="docs-links">
              <a href="https://www.gov.uk/bank-holidays" target="_blank">UK Government bank holiday schedule</a>
            </p>
          </Section>

          <Section id="distance" num={6} title="Distance Decay">
            <p>Not all events in Liverpool drive churro sales equally. The closer an event is to Baltic Market, the more of its attendees will walk over and buy food. Distance decay captures this using a smooth Gaussian function.</p>
            <HighlightBox>
              <strong>Example.</strong> An event at Baltic Market itself (0km) contributes at full strength. An event at M&S Bank Arena (0.63km) decays to 92 percent. An event at Pier Head (1.6km) decays to 57 percent. An event at Anfield (4.5km) decays to effectively zero.
            </HighlightBox>
            <h3>How it works</h3>
            <p>Event coordinates are compared to Baltic Market (53.3934, -2.9851) using the Haversine formula, which accounts for Earth's curvature. The distance is fed into a Gaussian decay function with sigma 1.5km, producing a smooth bell curve where impact drops to 50 percent at roughly 1.8km and to less than 1 percent beyond 5km. Events with unknown coordinates get a flat 0.35 default, assuming they are likely in the Baltic Triangle area.</p>
            <h3>Assumptions</h3>
            <ol className="docs-assumptions">
              <li>Baltic Market (53.3934, -2.9851) is the geographic centre of all distance calculations.</li>
              <li>Gaussian sigma of 1.5km was chosen so that the city centre edge retains approximately 50 percent impact.</li>
              <li>People are willing to walk up to roughly 1.5km for food but rarely beyond 3km.</li>
              <li>Linear distance does not account for actual walking paths, obstacles, or public transit.</li>
              <li>Events with unknown coordinates are assumed to be within the Baltic Triangle area (0.35 default).</li>
            </ol>
            <h3>Formula</h3>
            <PythonBlock>{`d = haversine(event, Baltic Market)

decay = e^(-d² / 4.5)

σ = 1.5 km`}</PythonBlock>
            <p className="docs-links">
              <a href="https://en.wikipedia.org/wiki/Haversine_formula" target="_blank">Haversine formula on Wikipedia</a>
              <span className="docs-link-sep">|</span>
              <a href="https://en.wikipedia.org/wiki/Gaussian_function" target="_blank">Gaussian function on Wikipedia</a>
            </p>
          </Section>

          <Section id="venue" num={7} title="Venue Proximity">
            <p>Each of the 14 venues within approximately 1.8km of Baltic Market has a churro weight representing the likelihood that someone at that venue will walk to Baltic Market and buy a churro.</p>
            <HighlightBox>
              <strong>Example.</strong> Camp and Furnace (same building complex, 0.04km away) has a 0.95 churro weight. M&S Bank Arena (0.63km, concert crowds seeking food) has a 0.55 weight. Anfield stadium (4.5km away) is excluded from the venue list entirely.
            </HighlightBox>
            <h3>How it works</h3>
            <p>The system maintains a filtered list of 14 venues within walking distance of Baltic Market, each with a churroWeight between 0.0 and 1.0. For Ticketmaster events, the estimated attendance is multiplied by the venue's churroWeight to produce a churro-effective attendance. Five venues too far away were removed: Sefton Park, Anfield, Goodison Park, Aintree Racecourse, and a duplicate Echo Arena entry.</p>
            <h3>Assumptions</h3>
            <ol className="docs-assumptions">
              <li>Walking range for food-seeking behaviour is approximately 1.8km.</li>
              <li>Venue churro weights are prior estimates and should be calibrated against actual sales data.</li>
              <li>Baltic Market itself has weight 1.00 (events at the market directly drive sales).</li>
              <li>Pier Head capacity (50,000) is an outdoor event estimate, not a fixed structure capacity.</li>
            </ol>
            <h3>Formula</h3>
            <PythonBlock>{`A_effective = A_raw × venue_weight

weight ∈ {Baltic Market: 1.00, M&S Bank Arena: 0.55, Anfield: excluded}`}</PythonBlock>
          </Section>

          <Section id="score-assembly" num={8} title="Score Assembly">
            <p>All the individual parameters combine into a single 0 to 100 score through a three-part additive formula. The base multiplier captures organic daily demand, while events and holidays add extraordinary spikes.</p>
            <HighlightBox>
              <strong>Example.</strong> A normal Saturday in July with partly cloudy weather and no special events: base 30 times Saturday 1.30 times July tourism 1.19 times weather 0.96 equals approximately 45 points. Add 7 points for the Baltic Market Weekend recurring event for a total of 52, a "Busy" day suggesting 2 staff.
            </HighlightBox>
            <h3>How it works</h3>
            <p>The final score is the sum of three independent components. The base multiplier (30 x weekdayMult x tourismMult x weatherMult) captures organic demand from the market's normal customer base. The event contribution sums individual event impacts via Michaelis-Menten saturation with distance decay and category relevance, capped at 50 points. The holiday boost adds type-weighted holiday scores, capped at 15 points. The raw sum is rounded and clamped to 0 through 100.</p>
            <table className="docs-table">
              <thead>
                <tr><th>Score</th><th>Level</th><th>Staffing</th></tr>
              </thead>
              <tbody>
                <tr><td>0</td><td>Closed</td><td>No staff</td></tr>
                <tr><td>1-15</td><td>Quiet</td><td>1 staff</td></tr>
                <tr><td>16-35</td><td>Steady</td><td>1 staff</td></tr>
                <tr><td>36-60</td><td>Busy</td><td>2 staff</td></tr>
                <tr><td>61-80</td><td>Very Busy</td><td>3 staff</td></tr>
                <tr><td>81-100</td><td>Crush</td><td>3-4 staff</td></tr>
              </tbody>
            </table>
            <h3>Assumptions</h3>
            <ol className="docs-assumptions">
              <li>The three components (base, events, holidays) are independent and additive with no interaction effects.</li>
              <li>The base score of 30 represents an "average" operating day with neutral multipliers.</li>
              <li>Event and holiday caps prevent unrealistic score inflation from extreme scenarios.</li>
              <li>The level thresholds (15, 35, 60, 80) are logarithmically spaced because operational impact is non-linear.</li>
              <li>A score of 0 always means the market is closed, not just zero demand.</li>
              <li>The 0 to 100 range maps approximately to 0 to 250 churro portions sold per day.</li>
            </ol>
            <h3>Formula</h3>
            <PythonBlock>{`S_base = 30 × D × T × W

S_raw = S_base + S_events + S_holidays

S_final = clamp(round(S_raw), 0, 100)`}</PythonBlock>
          </Section>

          <Section id="confidence" num={9} title="Confidence">
            <p>Every forecast comes with a confidence score (0.0 to 1.0) and a score range. Confidence decreases with forecast horizon and varies by data source reliability.</p>
            <HighlightBox>
              <strong>Example.</strong> A forecast for tomorrow with a Ticketmaster-confirmed event has 0.93 confidence and a tight range of plus or minus 2 points. A forecast 14 days out with an approximate annual event date has 0.55 confidence and a wider range of plus or minus 8 points.
            </HighlightBox>
            <h3>How it works</h3>
            <p>Weather confidence decays linearly with forecast horizon at 0.05 per day, bottoming out at 0.30. Event confidence depends on the source: Ticketmaster confirmed events get 0.95, recurring events get 0.85, and annual events with approximate date patterns get 0.60. The two confidences are averaged. The score range is plus or minus 15 times (1 minus confidence) points, helping the operator decide how conservatively to staff.</p>
            <h3>Assumptions</h3>
            <ol className="docs-assumptions">
              <li>Weather forecast accuracy decays linearly at 5 percent per day, a conservative estimate.</li>
              <li>Ticketmaster events are assumed 95 percent reliable for date and attendance.</li>
              <li>Annual events with approximate date patterns have inherent date uncertainty.</li>
              <li>Confidence affects only the display range, not the calculated score.</li>
              <li>The plus or minus 15-point band was chosen empirically to cover approximately one level width.</li>
            </ol>
            <h3>Formula</h3>
            <PythonBlock>{`C_weather = max(0.30, 1 - 0.05 × days_ahead)

C_event  = min by source: ticketmaster=0.95, annual=0.60, recurring=0.85

C = (C_weather + C_event) / 2

range = [score ± 15 × (1 - C)]`}</PythonBlock>
            <p className="docs-links">
              <a href="https://en.wikipedia.org/wiki/Confidence_interval" target="_blank">Confidence intervals on Wikipedia</a>
              <span className="docs-link-sep">|</span>
              <a href="https://open-meteo.com/en/docs" target="_blank">Open-Meteo forecast accuracy</a>
            </p>
          </Section>

        </div>
      </main>
    </div>
  );
}
