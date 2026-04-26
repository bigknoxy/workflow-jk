"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";

// Mock organizations for simulation
const MOCK_ORGANIZATIONS = [
  { id: 'org_acme', name: 'Acme Corporation', slug: 'acme' },
  { id: 'org_globex', name: 'Globex Inc', slug: 'globex' },
  { id: 'org_sexyou', name: 'SexYousolutions', slug: 'sexyou' },
];

const MOCK_ROLES = ['user', 'org_admin', 'super_admin'] as const;
type MockRole = typeof MOCK_ROLES[number];

// Disable static generation for this page
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [selectedOrg, setSelectedOrg] = useState(MOCK_ORGANIZATIONS[0]);
  const [selectedRole, setSelectedRole] = useState<MockRole>(MOCK_ROLES[0]);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && selectedOrg.id) {
      router.push('/projects');
    }
  }, [isAuthenticated, selectedOrg.id, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    
    // Simulate login process
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    login({
      organizationId: selectedOrg.id,
      organizationName: selectedOrg.name,
      role: selectedRole,
    });
    
    setSubmitting(false);
    router.push('/projects');
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        Sign In
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
        Select your organization and role to continue (simulation mode)
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <label htmlFor="organization">Organization</label>
          <select
            id="organization"
            value={selectedOrg.id}
            onChange={(e) => {
              const org = MOCK_ORGANIZATIONS.find(o => o.id === e.target.value);
              if (org) setSelectedOrg(org);
            }}
            style={{ marginTop: '0.25rem' }}
          >
            {MOCK_ORGANIZATIONS.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <label htmlFor="role">Role</label>
          <select
            id="role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as typeof MOCK_ROLES[number])}
            style={{ marginTop: '0.25rem' }}
          >
            {MOCK_ROLES.map((role) => (
              <option key={role} value={role}>
                {role.replace('_', ' ')}
              </option>
            ))}
          </select>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
            Roles determine what UI elements and features you can access.
          </p>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
          style={{ padding: '0.75rem 1rem', fontSize: '1rem' }}
        >
          {submitting ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="card" style={{ marginTop: '2rem', fontSize: '0.875rem' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Current Session Info:</h3>
        <pre style={{ 
          background: 'var(--bg)', 
          border: '1px solid var(--border)', 
          padding: '0.75rem',
          borderRadius: '0.375rem',
          overflow: 'auto'
        }}>
          {typeof window !== 'undefined' ? JSON.stringify({
            organization: selectedOrg,
            role: selectedRole,
            session_id: sessionStorage.getItem('workflow-jk-session-id') || 'none',
          }, null, 2) : (
            <span style={{ color: 'var(--muted)' }}>Session info (client-side only)</span>
          )}
        </pre>
      </div>
    </div>
  );
}
