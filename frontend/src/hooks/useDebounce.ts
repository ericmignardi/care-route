import { useEffect, useState } from "react";

/**
 * Delays a value so a search box does not fire a request per keystroke. The client and
 * caregiver tables in Phase 5 are the callers.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
