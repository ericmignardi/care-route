import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

interface CountUpProps {
  value: number;
  /** Renders the tick. Defaults to a whole number; the completion-rate tile passes one decimal. */
  format?: (value: number) => string;
  className?: string;
  durationMs?: number;
}

/**
 * A KPI that counts up to its value on arrival.
 *
 * Two things make this honest rather than decorative. The ticking digits are
 * `aria-hidden` and the exact figure is rendered alongside them for screen readers, so
 * nobody has to listen to a number climb. And it counts only on the *first* value it is
 * given — a refetch that moves "visits today" from 7 to 8 snaps, because re-running the
 * animation would make a one-visit change look like the whole day reloaded.
 */
export function CountUp({ value, format = (n) => String(Math.round(n)), className, durationMs = 650 }: CountUpProps) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? value : 0);
  const counted = useRef(false);

  useEffect(() => {
    if (counted.current || reduceMotion) {
      setShown(value);
      counted.current = true;
      return;
    }
    counted.current = true;

    let frame = 0;
    const started = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / durationMs);
      // Cubic ease-out: fast off the mark, settling onto the real figure rather than
      // arriving at it abruptly.
      setShown(value * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setShown(value);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduceMotion, durationMs]);

  return (
    <span className={className}>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
