export function Logo({ size = 18 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
    >
      <line x1="6.5" y1="2.5" x2="6.5" y2="8.5" stroke="#ffffff" strokeWidth="1.4" />
      <line x1="12" y1="1" x2="12" y2="9" stroke="#ffffff" strokeWidth="1.4" />
      <line x1="17.5" y1="2.5" x2="17.5" y2="8.5" stroke="#ffffff" strokeWidth="1.4" />
      <line x1="5" y1="8.5" x2="19" y2="8.5" stroke="#ffffff" strokeWidth="1.4" />
      <line x1="12" y1="9" x2="12" y2="23" stroke="#ffffff" strokeWidth="1.4" />
      <rect x="11" y="7.5" width="2" height="3" fill="#ffffff" />
    </svg>
  );
}
