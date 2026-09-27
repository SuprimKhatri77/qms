import { formatCountdown } from "@/lib/format";

type RateLimitNoticeProps = {
  secondsLeft: number;
  // What happens when the timer ends. Forms wait for the user to try again;
  // the verify page retries by itself, so it says so instead.
  retryLabel?: string;
};

// Shown in a form after the API rate-limits it, with a live countdown.
// Only the first line is a live region: if the ticking number were inside
// it, a screen reader would read the time out again every second.
export function RateLimitNotice({
  secondsLeft,
  retryLabel = "Please try again in",
}: RateLimitNoticeProps) {
  if (secondsLeft <= 0) {
    return null;
  }

  return (
    <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      <p role="alert">Too many attempts.</p>
      <p>
        {retryLabel}{" "}
        <span className="font-medium tabular-nums">
          {formatCountdown(secondsLeft)}
        </span>
        .
      </p>
    </div>
  );
}
