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
      {/* Wallet body */}
      <rect
        x="3"
        y="6"
        width="18"
        height="12"
        rx="2"
        ry="2"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      
      {/* Wallet flap */}
      <path
        d="M5 6V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      
      {/* Card slot */}
      <rect
        x="16"
        y="10"
        width="4"
        height="4"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      
      {/* Card slot circle */}
      <circle
        cx="18"
        cy="12"
        r="0.5"
        fill="currentColor"
      />
    </svg>
  );
}