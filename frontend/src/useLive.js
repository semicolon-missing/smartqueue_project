import { useCallback, useEffect, useState } from "react";

export function useLive(load, intervalMs) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const refresh = useCallback(
    () =>
      load()
        .then((result) => {
          setData(result);
          setError("");
        })
        .catch((err) => setError(err.message)),
    [load],
  );

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs]);

  return { data, error, refresh };
}
