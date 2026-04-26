const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Get session ID from storage
const getSessionId = (): string => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('workflow-jk-session-id') || 
           `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// Get auth state from storage for additional API headers
const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  
  try {
    const auth = localStorage.getItem('workflow-jk-auth');
    if (auth) {
      const state = JSON.parse(auth);
      return {
        'X-Organization-Id': state.organizationId || '',
        'X-Session-Id': getSessionId(),
        'X-Actor': state.userId || 'anonymous',
        'X-Role': state.role || 'user',
      };
    }
  } catch {
    // Ignore errors for non-authenticated state
  }
  
  return {
    'X-Session-Id': getSessionId(),
    'X-Actor': 'anonymous',
    'X-Role': 'user',
  };
};

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...options?.headers,
  };
  
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  return res.json();
}

// Direct fetch wrapper that includes auth headers but doesn't throw on error
export async function apiFetchRaw(path: string, options?: RequestInit): Promise<Response> {
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...options?.headers,
  };
  
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
}