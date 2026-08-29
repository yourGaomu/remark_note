import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncResource<T> {
  data?: T;
  error?: string;
  loading: boolean;
  refreshing: boolean;
  reload(): Promise<void>;
}

export function useAsyncResource<T>(loader: () => Promise<T>, dependencies: readonly unknown[] = []): AsyncResource<T> {
  const mounted = useRef(true);
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    const hasData = data !== undefined;
    hasData ? setRefreshing(true) : setLoading(true);
    setError(undefined);

    try {
      const result = await loader();
      if (mounted.current) {
        setData(result);
      }
    } catch (caught) {
      if (mounted.current) {
        setError(caught instanceof Error ? caught.message : '加载失败，请稍后重试');
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  // loader is expected to be memoized by the caller.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loader, data !== undefined, ...dependencies]);

  useEffect(() => {
    mounted.current = true;
    void reload();
    return () => {
      mounted.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, error, loading, refreshing, reload };
}
