import { useState, useCallback, useRef } from "react";

/**
 * Replaces the duplicated loading/error/result triad that appeared ~9 times
 * across LessonPlanner, MaterialsPage, EvaluatePage, etc. Each of those
 * components hand-rolled the same:
 *
 *   const [loading, setLoading] = useState(false);
 *   const [result, setResult] = useState(null);
 *   const [error, setError] = useState("");
 *   try { setLoading(true); setError(""); ... setResult(data); }
 *   catch (err) { setError(err.message || "..."); }
 *   finally { setLoading(false); }
 *
 * Usage:
 *   const { loading, error, result, run } = useAsyncAction();
 *   const data = await run(() => apiPost("/generate", payload));
 *
 * The `run` function accepts an async function, manages loading/error/result
 * state, and returns the result (or throws if you want to handle it yourself).
 */
export function useAsyncAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const mountedRef = useRef(true);

  const run = useCallback(async (asyncFn) => {
    setLoading(true);
    setError("");
    try {
      const data = await asyncFn();
      if (mountedRef.current) {
        setResult(data);
        setLoading(false);
      }
      return data;
    } catch (err) {
      if (mountedRef.current) {
        setError(err?.message || "Something went wrong.");
        setLoading(false);
      }
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError("");
    setResult(null);
  }, []);

  const setResult_ = useCallback((value) => {
    if (mountedRef.current) setResult(value);
  }, []);

  return { loading, error, result, setResult: setResult_, reset, run };
}
