'use client';

export default function ChurroIcon({ size = 48 }: { size?: number }) {
  return (
    <span
      className="churro-icon"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        className="churro-static"
        src="/churro-image.svg"
        alt=""
        width={size}
        height={size}
      />
    </span>
  );
}
