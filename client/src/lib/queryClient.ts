import { QueryClient } from "@tanstack/react-query";
import { auth } from "./firebase";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        
        const token = await auth.currentUser?.getIdToken();
        
        const res = await fetch(url, {
          headers: token ? {
            'Authorization': `Bearer ${token}`,
          } : {},
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed: ${res.status}`);
        }

        return res.json();
      },
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 0,
    },
  },
});

export async function apiRequest(
  method: string,
  url: string,
  data?: any
): Promise<any> {
  const token = await auth.currentUser?.getIdToken();

  console.log('[API REQUEST]', method, url, 'Auth token:', token ? 'present' : 'missing');

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  console.log('[API RESPONSE]', method, url, 'Status:', res.status, 'Content-Type:', res.headers.get('content-type'));

  const text = await res.text();
  console.log('[API RESPONSE TEXT]', text.substring(0, 500));

  if (!res.ok) {
    console.error('[API ERROR]', text.substring(0, 500));
    let errorData: any = {};
    try {
      errorData = JSON.parse(text);
    } catch (e) {
      // Response is not JSON
    }
    throw new Error(errorData.error || `Request failed: ${res.status}`);
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('[JSON PARSE ERROR]', 'Failed to parse as JSON:', text.substring(0, 500));
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
  }
}
