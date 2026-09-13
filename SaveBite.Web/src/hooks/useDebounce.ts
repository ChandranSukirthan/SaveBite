import { useState, useEffect } from "react";

/**
 * Custom hook to debounce any fast-changing value.
 * Commonly used for search inputs, resize events, and slider changes.
 *
 * @param value The value to debounce
 * @param delayMs Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

