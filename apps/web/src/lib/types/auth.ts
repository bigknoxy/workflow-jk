// Auth Types and Interfaces
export type Role = 'user' | 'org_admin' | 'super_admin';

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface AuthState {
  userId: string;
  email: string;
  name: string;
  organizationId: string;
  organizationName: string;
  role: Role;
  sessionId: string;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (options: { organizationId: string; organizationName: string; role: Role }) => void;
  logout: () => void;
  switchOrganization: (org: Organization) => void;
  setRole: (role: Role) => void;
  updateOrganization: (org: Organization) => void;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}
