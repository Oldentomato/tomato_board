import { cn } from "@/lib/utils/cn";

export function WorkspaceIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={cn("h-8 w-8", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="ws-sky" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="0.45" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#bae6fd" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#ws-sky)" />
      <rect
        x="5"
        y="6"
        width="22"
        height="20"
        rx="3.5"
        fill="#fff"
        fillOpacity="0.1"
        stroke="#fff"
        strokeOpacity="0.22"
        strokeWidth="0.6"
      />
      {/* weather */}
      <rect x="7" y="8" width="9" height="8" rx="1.8" fill="#7dd3fc" fillOpacity="0.9" />
      <circle cx="10" cy="11.5" r="1.6" fill="#fff" fillOpacity="0.85" />
      <path
        d="M13.5 13.2c0-1.4 1-2.4 2.2-2.4s2.2 1 2.2 2.4"
        stroke="#fff"
        strokeOpacity="0.7"
        strokeWidth="0.7"
        strokeLinecap="round"
      />
      {/* mail */}
      <rect x="17" y="8" width="8" height="8" rx="1.8" fill="#fbbf24" fillOpacity="0.88" />
      <path
        d="M18.2 11.2 21 13.4 23.8 11.2"
        stroke="#fff"
        strokeOpacity="0.9"
        strokeWidth="0.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="18.2" y="10.6" width="6.6" height="4.8" rx="0.6" stroke="#fff" strokeOpacity="0.55" strokeWidth="0.55" />
      {/* calendar */}
      <rect x="7" y="17" width="9" height="7" rx="1.8" fill="#a78bfa" fillOpacity="0.88" />
      <rect x="7" y="17" width="9" height="2.2" rx="1.8" fill="#fff" fillOpacity="0.28" />
      <circle cx="9.8" cy="21.2" r="0.75" fill="#fff" fillOpacity="0.75" />
      <circle cx="12.2" cy="21.2" r="0.75" fill="#fff" fillOpacity="0.75" />
      <circle cx="14.6" cy="21.2" r="0.75" fill="#fff" fillOpacity="0.45" />
      {/* memo */}
      <rect x="17" y="17" width="8" height="7" rx="1.8" fill="#fde68a" fillOpacity="0.92" />
      <path
        d="M18.5 19.3h5M18.5 21h3.8M18.5 22.7h4.5"
        stroke="#fff"
        strokeOpacity="0.55"
        strokeWidth="0.65"
        strokeLinecap="round"
      />
    </svg>
  );
}
