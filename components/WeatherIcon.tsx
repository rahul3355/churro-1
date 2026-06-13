'use client';

const WMO_ICON_MAP: Record<number, string> = {
  0: 'sun',
  1: 'cloud-sun',
  2: 'cloud-sun',
  3: 'cloud',
  45: 'cloud-fog',
  48: 'cloud-fog',
  51: 'cloud-drizzle',
  53: 'cloud-drizzle',
  55: 'cloud-drizzle',
  61: 'cloud-rain',
  63: 'cloud-rain',
  65: 'cloud-rain',
  71: 'cloud-snow',
  73: 'cloud-snow',
  75: 'cloud-snow',
  80: 'cloud-rain',
  81: 'cloud-rain',
  82: 'cloud-rain',
  95: 'cloud-lightning',
  96: 'cloud-lightning',
  99: 'cloud-lightning',
};

export function weatherIconKey(code: number): string {
  return WMO_ICON_MAP[code] ?? 'cloud';
}

export default function WeatherIcon({
  code,
  size = 20,
}: {
  code?: number;
  size?: number;
}) {
  const key = code != null ? weatherIconKey(code) : 'cloud';

  return (
    <span
      className="weather-icon"
      style={{ width: size, height: size, display: 'inline-flex', flexShrink: 0 }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {key === 'sun' && <SunIcon />}
        {key === 'cloud-sun' && <CloudSunIcon />}
        {key === 'cloud' && <CloudIcon />}
        {key === 'cloud-fog' && <CloudFogIcon />}
        {key === 'cloud-drizzle' && <CloudDrizzleIcon />}
        {key === 'cloud-rain' && <CloudRainIcon />}
        {key === 'cloud-snow' && <CloudSnowIcon />}
        {key === 'cloud-lightning' && <CloudLightningIcon />}
      </svg>
    </span>
  );
}

function SunIcon() {
  return (
    <>
      <circle cx="16" cy="16" r="5" />
      <g className="anim-spin" style={{ transformOrigin: '16px 16px' }}>
        <line x1="16" y1="2" x2="16" y2="5" />
        <line x1="16" y1="27" x2="16" y2="30" />
        <line x1="2" y1="16" x2="5" y2="16" />
        <line x1="27" y1="16" x2="30" y2="16" />
        <line x1="6.1" y1="6.1" x2="8.2" y2="8.2" />
        <line x1="23.8" y1="23.8" x2="25.9" y2="25.9" />
        <line x1="25.9" y1="6.1" x2="23.8" y2="8.2" />
        <line x1="6.1" y1="25.9" x2="8.2" y2="23.8" />
      </g>
    </>
  );
}

function CloudSunIcon() {
  return (
    <>
      <g className="anim-spin" style={{ transformOrigin: '11px 11px' }}>
        <line x1="11" y1="2" x2="11" y2="5" />
        <line x1="4" y1="11" x2="7" y2="11" />
        <line x1="6.1" y1="6.1" x2="8.2" y2="8.2" />
        <line x1="15.9" y1="6.1" x2="13.8" y2="8.2" />
      </g>
      <circle cx="11" cy="11" r="3.5" />
      <path
        className="anim-drift"
        d="M8 20 Q8 14 14 14 Q16 10 20 12 Q24 10 26 14 Q30 14 30 18 Q30 22 26 22 L10 22 Q8 22 8 20Z"
      />
    </>
  );
}

function CloudIcon() {
  return (
    <path
      className="anim-drift"
      d="M6 20 Q6 13 12 13 Q14 8 20 10 Q26 6 28 13 Q32 13 32 18 Q32 22 28 22 L8 22 Q6 22 6 20Z"
    />
  );
}

function CloudFogIcon() {
  return (
    <>
      <path
        className="anim-drift"
        d="M6 16 Q6 10 12 10 Q14 6 20 8 Q26 4 28 10 Q32 10 32 14 Q32 18 28 18 L8 18 Q6 18 6 16Z"
      />
      <g className="anim-fog">
        <line x1="8" y1="22" x2="22" y2="22" />
        <line x1="11" y1="25" x2="25" y2="25" />
        <line x1="14" y1="28" x2="20" y2="28" />
      </g>
    </>
  );
}

function CloudDrizzleIcon() {
  return (
    <>
      <path
        className="anim-drift"
        d="M7 18 Q7 12 13 12 Q15 8 20 10 Q26 6 28 12 Q32 12 32 16 Q32 20 28 20 L9 20 Q7 20 7 18Z"
      />
      <line className="anim-fall" x1="14" y1="21" x2="13" y2="26" />
      <line className="anim-fall" x1="18" y1="21" x2="17" y2="26" />
      <line className="anim-fall" x1="22" y1="21" x2="21" y2="26" />
    </>
  );
}

function CloudRainIcon() {
  return (
    <>
      <path
        className="anim-drift"
        d="M7 18 Q7 12 13 12 Q15 8 20 10 Q26 6 28 12 Q32 12 32 16 Q32 20 28 20 L9 20 Q7 20 7 18Z"
      />
      <line className="anim-fall" x1="12" y1="21" x2="10" y2="28" />
      <line className="anim-fall" x1="16" y1="21" x2="14" y2="28" />
      <line className="anim-fall" x1="20" y1="21" x2="18" y2="28" />
      <line className="anim-fall" x1="24" y1="21" x2="22" y2="28" />
    </>
  );
}

function CloudSnowIcon() {
  return (
    <>
      <path
        className="anim-drift"
        d="M7 18 Q7 12 13 12 Q15 8 20 10 Q26 6 28 12 Q32 12 32 16 Q32 20 28 20 L9 20 Q7 20 7 18Z"
      />
      <circle className="anim-float" cx="13" cy="23" r="1.5" />
      <circle className="anim-float" cx="17" cy="24" r="1.2" />
      <circle className="anim-float" cx="21" cy="22" r="1.4" />
      <circle className="anim-float" cx="15" cy="27" r="1.3" />
      <circle className="anim-float" cx="19" cy="28" r="1.5" />
    </>
  );
}

function CloudLightningIcon() {
  return (
    <>
      <path
        className="anim-drift"
        d="M7 20 Q7 14 13 14 Q15 10 20 12 Q26 8 28 14 Q32 14 32 18 Q32 22 28 22 L9 22 Q7 22 7 20Z"
      />
      <path className="anim-flash" d="M18 21 L14 26 L17 26 L13 31 L22 25 L19 25 L22 21Z" />
    </>
  );
}
