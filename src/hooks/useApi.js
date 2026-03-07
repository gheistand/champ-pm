import { useAuth } from '@clerk/clerk-react';
import { useCallback } from 'react';

export function useApi() {
  const { getToken } = useAuth();

  const request = useCallback(
    async (url, method = 'GET', body = null) => {
      const token = await getToken();
      const options = {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };
      if (body !== null) options.body = JSON.stringify(body);

      const res = await fetch(url, options);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      return data;
    },
    [getToken]
  );

  return {
    get: useCallback((url) => request(url, 'GET'), [request]),
    post: useCallback((url, body) => request(url, 'POST', body), [request]),
    put: useCallback((url, body) => request(url, 'PUT', body), [request]),
    del: useCallback((url) => request(url, 'DELETE'), [request]),
  };
}
