'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getSessionId } from '@/lib/contexts/AuthContext';

export interface NavbarLink {
  href: string;
  label: string;
  requiredRole?: 'user' | 'org_admin' | 'super_admin';
}

export default function Navbar() {
  const router = useRouter();
  const { 
    isAuthenticated, 
    organizationId, 
    organizationName,
    role,
    logout,
    switchOrganization,
    setRole,
    updateOrganization 
  } = useAuth();
  
  const [showOrgSelector, setShowOrgSelector] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  
  // Ensure role is set to a valid value
  const effectiveRole = role || 'user';

  // Mock organizations for org switching
  const MOCK_ORGANIZATIONS = [
    { id: 'org_acme', name: 'Acme Corporation' },
    { id: 'org_globex', name: 'Globex Inc' },
    { id: 'org_sexyou', name: 'SexYousolutions' },
  ];

  // Mock roles for role switching
  const MOCK_ROLES = [
    { id: 'user', label: 'User' },
    { id: 'org_admin', label: 'Organization Admin' },
    { id: 'super_admin', label: 'Super Admin' },
  ];

  // Navigation links based on role
  const navLinks: NavbarLink[] = [
    { href: '/projects', label: 'Projects' },
    { href: '/tasks', label: 'Tasks' },
  ];

  const adminLinks: NavbarLink[] = [
    { href: '/audit-logs', label: 'Audit Logs', requiredRole: 'org_admin' },
  ];

  const superAdminLinks: NavbarLink[] = [
    { href: '/settings', label: 'Settings', requiredRole: 'super_admin' },
  ];

  // Filter visible links based on current role
  const visibleLinks = [...navLinks];
  if (effectiveRole === 'org_admin' || effectiveRole === 'super_admin') {
    visibleLinks.push(...adminLinks);
  }
  if (effectiveRole === 'super_admin') {
    visibleLinks.push(...superAdminLinks);
  }

  // For non-React contexts
  useEffect(() => {
    // Initialize session ID if not present
    if (!getSessionId()) {
      const id = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      sessionStorage.setItem('workflow-jk-session-id', id);
    }
  }, []);

  return (
    <nav 
      style={{ 
        borderBottom: '1px solid var(--border)', 
        padding: '0.75rem 1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      {/* Logo */}
      <a 
        href="/" 
        style={{ 
          fontWeight: 700, 
          fontSize: '1.125rem', 
          color: 'var(--primary)', 
          textDecoration: 'none',
          marginRight: 'auto',
        }}
      >
        Workflow JK
      </a>

      {/* Authenticated user info */}
      {isAuthenticated && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem',
          fontSize: '0.875rem',
          marginRight: 'auto',
        }}>
          <div style={{ 
            background: 'var(--card-bg)', 
            padding: '0.25rem 0.75rem', 
            borderRadius: '0.375rem',
            border: '1px solid var(--border)',
          }}>
            <span style={{ color: 'var(--muted)' }}>Org:</span>{' '}
            <strong>{organizationName || 'No org'}</strong>
          </div>
          <div style={{ 
            background: effectiveRole === 'org_admin' ? 'var(--primary)' : 
                        effectiveRole === 'super_admin' ? 'var(--danger)' : 'var(--muted)',
            color: 'white',
            padding: '0.125rem 0.5rem', 
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}>
            {effectiveRole.replace('_', ' ')}
          </div>
        </div>
      )}

      {/* Navigation Links */}
      {visibleLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          style={{ 
            color: 'var(--text)', 
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          {link.label}
        </a>
      ))}

      {/* Login Button */}
      {!isAuthenticated && (
        <button
          onClick={() => router.push('/login')}
          className="btn btn-primary"
        >
          Sign In
        </button>
      )}

      {/* Logout Button */}
      {isAuthenticated && (
        <button
          onClick={() => {
            logout();
            router.push('/');
          }}
          style={{
            background: 'var(--danger)',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Logout
        </button>
      )}

      {/* Organization Switcher */}
      {isAuthenticated && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowOrgSelector(!showOrgSelector)}
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Switch Organization
          </button>
          
          {showOrgSelector && (
            <div 
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '0.5rem',
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                minWidth: '200px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                zIndex: 100,
              }}
              onMouseLeave={() => setShowOrgSelector(false)}
            >
              <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                <strong style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Select Organization</strong>
              </div>
              {MOCK_ORGANIZATIONS.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    updateOrganization({ id: org.id, name: org.name, slug: org.id });
                    setShowOrgSelector(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: 'var(--text)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {org.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Role Switcher (Admin Only) */}
      {(role === 'org_admin' || role === 'super_admin') && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowRoleSelector(!showRoleSelector)}
            style={{
              background: effectiveRole === 'super_admin' ? 'var(--danger)' : 'var(--primary)',
              color: 'white',
              border: 'none',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {effectiveRole === 'user' ? 'User' : effectiveRole.replace('_', ' ')}
          </button>
          
          {showRoleSelector && (
            <div 
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '0.5rem',
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                minWidth: '180px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                zIndex: 100,
              }}
              onMouseLeave={() => setShowRoleSelector(false)}
            >
              <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                <strong style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Switch Role</strong>
              </div>
              {MOCK_ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setRole(r.id as 'user' | 'org_admin' | 'super_admin');
                    setShowRoleSelector(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: 'var(--text)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
