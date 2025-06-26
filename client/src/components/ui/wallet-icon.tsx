interface WalletIconProps {
  className?: string;
}

export function WalletIcon({ className = "w-5 h-5" }: WalletIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Main wallet shape */}
      <path
        d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Wallet opening/flap line */}
      <path
        d="M4 10h16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      
      {/* Credit card representation */}
      <rect
        x="6"
        y="13"
        width="6"
        height="3"
        rx="0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.7"
      />
      
      {/* Card chip */}
      <rect
        x="7"
        y="14"
        width="1"
        height="1"
        rx="0.2"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  );
}