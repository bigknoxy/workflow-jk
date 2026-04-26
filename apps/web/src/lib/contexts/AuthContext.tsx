"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AuthContextType, AuthState, AuthProviderProps, Role, Organization } from '../types/auth';

// Session ID for simulation - in production this would come from the backend
const getSessionIdValue = (): string => {
  if (typeof window === 'undefined') {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
  let sessionId = sessionStorage.getItem('workflow-jk-session-id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('workflow-jk-session-id', sessionId);
  }
  return sessionId;
};

// Default mock user - defined first for initial state
const defaultSessionId = getSessionIdValue();

const defaultUser: AuthState = {
  userId: 'user_mock',
  email: 'user@example.com',
  name: 'User',
  organizationId: '',
  organizationName: '',
  role: 'user' as const,
  sessionId: defaultSessionId,
  isAuthenticated: false,
  isLoading: false,
};

// Define context with default values
const AuthContext = createContext<AuthContextType>(undefined as any);

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>(defaultUser);

  // Helper to update auth state and persist
  const updateAuthState = useCallback((state: AuthState) => {
    setAuthState(state);
    localStorage.setItem('workflow-jk-auth', JSON.stringify(state));
  }, []);

  // Login function
  const login = useCallback(({ organizationId, organizationName, role }: { organizationId: string; organizationName: string; role: Role }) => {
    const state: AuthState = {
      ...defaultUser,
      organizationId,
      organizationName,
      role,
      isAuthenticated: true,
      isLoading: false,
    };
    updateAuthState(state);
  }, [updateAuthState]);

  // Logout function
  const logout = useCallback(() => {
    setAuthState(defaultUser);
    localStorage.removeItem('workflow-jk-auth');
    sessionStorage.removeItem('workflow-jk-session-id');
  }, []);

  // Switch organization function
  const switchOrganization = useCallback((org: Organization) => {
    setAuthState((prev) => ({
      ...prev,
      organizationId: org.id,
      organizationName: org.name,
      isAuthenticated: true,
    }));
  }, []);

  // Set role function
  const setRole = useCallback((role: Role) => {
    setAuthState((prev) => ({
      ...prev,
      role,
      isAuthenticated: true,
    }));
  }, []);

  // Update organization function
  const updateOrganization = useCallback((org: Organization) => {
    setAuthState((prev) => ({
      ...prev,
      organizationId: org.id,
      organizationName: org.name,
      isAuthenticated: true,
    }));
  }, []);

  const contextValue = {
    ...authState,
    login,
    logout,
    switchOrganization,
    setRole,
    updateOrganization,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // This should never happen in production
    console.warn('AuthContext is undefined - returning default auth state');
    const defaultSessionId = getSessionIdValue();
    return {
      ...defaultUser,
      sessionId: defaultSessionId,
      login: () => {},
      logout: () => {},
      switchOrganization: () => {},
      setRole: () => {},
      updateOrganization: () => {},
    };
  }
  return context;
}

// For non-react contexts (e.g., API calls)
export function getSessionId(): string {
  if (typeof window === 'undefined') {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
  return sessionStorage.getItem('workflow-jk-session-id') || defaultSessionId;
}
