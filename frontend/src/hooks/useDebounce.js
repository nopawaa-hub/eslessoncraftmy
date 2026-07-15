import { useCallback, useEffect, useRef } from "react";

/**
 * Returns a debounced version of `callback` that fires `delay` ms after the
 * last invocation. The timer is cleaned up on unmount.
 *
 * Used by the draft autosave: each keystroke calls the debounced save, but
 * the actual localStorage write only happens once typing pauses for 500ms.
 */
export function useDebouncedCallback(callback, delay = 500) {
  const timerRef = useRef(null);
  const callbackRef = useRef(callback);

  // Keep the latest callback without resetting the timer.
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debounced = useCallback(
    (...args) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
        timerRef.current = null;
      }, delay);
    },
    [delay],
  );

  // Flush any pending call immediately (e.g. on unmount or navigation).
  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      callbackRef.current();
    }
  }, []);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Clean up on unmount.
  useEffect(() => () => cancel(), [cancel]);

  return [debounced, flush, cancel];
}
