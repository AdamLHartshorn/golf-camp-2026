type PlayerSilhouetteProps = {
  className?: string;
  label?: string;
};

export function PlayerSilhouette({ className = "", label }: PlayerSilhouetteProps) {
  return (
    <div
      aria-label={label || "Player profile placeholder"}
      className={`player-silhouette flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#cfc4b3] bg-[#17130e] text-[#efe9dc] ${className}`}
      role="img"
    >
      <svg
        aria-hidden="true"
        className="h-[72%] w-[72%]"
        fill="none"
        viewBox="0 0 64 64"
      >
        <circle
          cx="32"
          cy="23"
          r="12"
          fill="currentColor"
          opacity="0.92"
        />
        <path
          d="M12 57c2.7-13.2 9.4-19.8 20-19.8S49.3 43.8 52 57"
          fill="currentColor"
          opacity="0.92"
        />
        <path
          d="M18 56.5c3.1-9.6 7.8-14.4 14-14.4s10.9 4.8 14 14.4"
          stroke="#f6f0e3"
          strokeLinecap="round"
          strokeWidth="2"
          opacity="0.18"
        />
      </svg>
    </div>
  );
}
