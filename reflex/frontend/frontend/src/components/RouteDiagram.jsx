export default function RouteDiagram() {
  return (
    <svg
      viewBox="0 0 320 90"
      className="hidden md:block w-72 shrink-0"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* dotted route line */}
      <line
        x1="55"
        y1="45"
        x2="270"
        y2="45"
        stroke="#3A4459"
        strokeWidth="2"
        strokeDasharray="1 8"
        strokeLinecap="round"
      />
      {/* origin: package */}
      <rect x="14" y="30" width="34" height="26" rx="4" fill="#EA5B35" />
      <rect x="14" y="30" width="34" height="9" rx="4" fill="#0B1324" />
      {/* waypoint dots */}
      <circle cx="95" cy="45" r="6" fill="#EA5B35" />
      <circle cx="150" cy="45" r="6" fill="#EA5B35" />
      <circle cx="205" cy="45" r="6" fill="#5B6472" />
      {/* destination: doorway */}
      <rect
        x="258"
        y="24"
        width="38"
        height="38"
        rx="8"
        stroke="#5B6472"
        strokeWidth="2"
      />
      <circle cx="286" cy="43" r="2" fill="#5B6472" />
    </svg>
  );
}
