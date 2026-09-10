import { useEffect, useState } from "react";

interface CountdownTimerProps {
  availableUntil: string;
  showEndingSoonBadge?: boolean;
}

export function CountdownTimer({
  availableUntil,
  showEndingSoonBadge = true,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
    isEndingSoon: boolean; // < 2 hours
  }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
    isEndingSoon: false,
  });

  useEffect(() => {
    function calculate() {
      const target = new Date(availableUntil).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
          isEndingSoon: false,
        });
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const isEndingSoon = diff < 2 * 60 * 60 * 1000; // less than 2 hours

      setTimeLeft({
        hours,
        minutes,
        seconds,
        isExpired: false,
        isEndingSoon,
      });
    }

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [availableUntil]);

  if (timeLeft.isExpired) {
    return (
      <span className="rst-countdown rst-countdown--expired">
        ⌛ Expired
      </span>
    );
  }

  const formattedTime = `${timeLeft.hours.toString().padStart(2, "0")}h ${timeLeft.minutes
    .toString()
    .padStart(2, "0")}m ${timeLeft.seconds.toString().padStart(2, "0")}s`;

  if (timeLeft.isEndingSoon && showEndingSoonBadge) {
    return (
      <div className="rst-ending-soon-wrapper">
        <span className="rst-ending-soon-pill">⚡ Ending Soon</span>
        <span className="rst-countdown rst-countdown--urgent">
          ⏱️ {formattedTime}
        </span>
      </div>
    );
  }

  return (
    <span className="rst-countdown">
      ⏱️ {formattedTime}
    </span>
  );
}

export default CountdownTimer;

