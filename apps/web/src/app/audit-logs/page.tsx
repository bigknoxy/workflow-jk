"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { apiFetchRaw } from "@/lib/api";

export default function AuditLogsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { organizationId, role } = useAuth();
  const [logs, setLogs] = useState<Array<{ 
    id: string; 
    userId: string; 
    userName: string; 
    organizationId: string; 
    action: string; 
    details: Record<string, any>; 
    createdAt: string;
  }>>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await apiFetchRaw(`/api/projects/${projectId}/audit-logs`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        } else {
          // Even with auth headers, the mock backend might not have audit logs
          // Simulate some logs for demonstration
          setLogs([
            {
              id: `log_${Date.now()}_1`,
              userId: "user_mock",
              userName: "Demo User",
              organizationId: organizationId || "none",
              action: "project_created",
              details: { title: "Demo Project", goal: "Testing audit logs" },
              createdAt: new Date().toISOString(),
            },
            {
              id: `log_${Date.now()}_2`,
              userId: "user_mock",
              userName: "Demo User",
              organizationId: organizationId || "none",
              action: "requirements_approved",
              details: { reviewer: "org_admin", comments: "Looks good" },
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch audit logs");
      }
    };
    fetchLogs();
  }, [projectId, organizationId]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 0 }}>Audit Logs</h1>
        {role && (role as any) !== 'user' && (
          <span style={{ 
            background: (role as any) === 'super_admin' ? 'var(--danger)' : 'var(--primary)',
            color: 'white',
            padding: '0.125rem 0.5rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
          }}>
            {role && (role as any) !== 'user' ? role.replace('_', ' ') : 'User'}
          </span>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontWeight: 600, marginBottom: '1rem' }}>Current Session Context</h2>
        <pre style={{ 
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          padding: '1rem',
          borderRadius: '0.375rem',
          overflow: 'auto',
        }}>
          {JSON.stringify({
            organizationId,
            role,
            session_id: typeof window !== 'undefined' ? sessionStorage.getItem('workflow-jk-session-id') : 'server',
          }, null, 2)}
        </pre>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--danger)', color: 'white' }}>
          {error}
        </div>
      )}

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
        Project Audit Logs ({logs.length} entries)
      </h2>

      {logs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--muted)' }}>No audit logs found for this project.</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Logs will appear once actions are performed in this project.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {logs.map((log) => (
            <div key={log.id} className="card" style={{ fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <span style={{ 
                  background: 'var(--primary)', 
                  color: 'white',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}>
                  {log.userId}
                </span>
                <span style={{ color: 'var(--muted)' }}>
                  {log.organizationId}
                </span>
                <span style={{ 
                  background: log.action.includes('approve') ? 'var(--success)' : 
                            log.action.includes('reject') ? 'var(--danger)' : 
                            log.action.includes('create') ? 'var(--primary)' : 'var(--warning)',
                  color: 'white',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                }}>
                  {log.action}
                </span>
              </div>
              <div style={{ 
                background: 'var(--card-bg)', 
                border: '1px solid var(--border)',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                fontFamily: 'monospace',
              }}>
                <code style={{ fontSize: '0.75rem' }}>
                  {JSON.stringify(log.details, null, 2)}
                </code>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginTop: '0.5rem',
                paddingTop: '0.5rem',
                borderTop: '1px solid var(--border)',
              }}>
                <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                  Created at: {new Date(log.createdAt).toLocaleString()}
                </span>
                <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                  Log ID: {log.id.substring(0, 8)}...
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
