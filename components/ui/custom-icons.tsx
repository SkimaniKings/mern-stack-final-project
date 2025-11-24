import type { LucideProps } from "lucide-react"

export function NetWorthIcon(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Stack of coins */}
      <circle cx="8" cy="8" r="5" />
      <circle cx="8" cy="8" r="2" />
      <circle cx="16" cy="16" r="5" />
      <circle cx="16" cy="16" r="2" />
      {/* Upward trend line */}
      <path d="M3 20l6-6 4 4 8-8" />
      <polyline points="19 8 22 11 19 14" />
    </svg>
  )
}

export function FinancialEducationIcon(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Graduation cap */}
      <path d="M12 2l10 5v5c0 5-5 10-10 10S2 17 2 12V7l10-5z" />
      <path d="M12 7v5" />
      {/* Book pages */}
      <path d="M8 12h8" />
      <path d="M8 16h8" />
      <path d="M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    </svg>
  )
}
