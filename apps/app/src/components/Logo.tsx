import type { SVGProps } from 'react';

export function Logo({ className = 'h-9 w-9 shrink-0', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label="Munshi logo"
      className={className}
      {...props}
    >
      {/* Terracotta Bahi Cover */}
      <rect x="24" y="20" width="52" height="60" rx="5" fill="#A95F32" />
      {/* Brass Gold Spine */}
      <path d="M29 20H35V80H29A5 5 0 0 1 24 75V25A5 5 0 0 1 29 20Z" fill="#C8A45C" />
      {/* Traditional Arch */}
      <g transform="translate(57 52) scale(.5) translate(-50 -47)">
        <path
          d="M28 80V46C28 34 38 28 44 24C47 22 49 20 50 14C51 20 53 22 56 24C62 28 72 34 72 46V80"
          fill="none"
          stroke="#C8A45C"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {/* Bookmark Ribbon */}
      <path d="M62 80V91L66 87L70 91V80Z" fill="#C8A45C" />
    </svg>
  );
}
