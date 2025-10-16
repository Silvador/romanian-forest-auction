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
  
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed: ${res.status}`);
  }

  return res.json();
}
