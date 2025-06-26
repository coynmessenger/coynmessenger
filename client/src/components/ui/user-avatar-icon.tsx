interface UserAvatarIconProps {
  className?: string;
}

export function UserAvatarIcon({ className = "w-8 h-8" }: UserAvatarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM8.5 9.5a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0zM12 14c-2.5 0-4.674.804-6.32 2.146C7.056 17.79 9.394 19 12 19s4.944-1.21 6.32-2.854C16.674 14.804 14.5 14 12 14z"
        clipRule="evenodd"
      />
    </svg>
  );
}