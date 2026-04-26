"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const STATE_COLORS: Record<string, string> = {
  Draft: "var(--muted)",
  IntakeInProgress: "var(--primary)",
  AwaitingClarification: "var(--warning)",
  RequirementsReadyForApproval: "var(--warning)",
  RequirementsApproved: "var(--success)",
  ArchitectureInProgress: "var(--primary)",
  AwaitingArchitectureApproval: "var(--warning)",
  ArchitectureApproved: "var(--success)",
  DevInProgress: "var(--primary)",
  QaInProgress: "var(--primary)",
  ReworkRequired: "var(--danger)",
  ReadyForRelease: "var(--success)",
  Completed: "var(--success)",
  Failed: "var(--danger)",
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [project, setProject] = useState<{ id: string; title: string; rawIdea: string; businessGoal: string; constraints: string[]; assumptions: string[] } | null>(null);
  const [workflow, setWorkflow] = useState<{ id: string; state: string; currentStage: string; createdAt: string; updatedAt: string } | null>(null);
  const [artifacts, setArtifacts] = useState<Array<{ id: string; type: string; version: number; summary: string; createdAt: string }>>([]);
  const [role, setRole] = useState<string>('user');
  const [organizationId, setOrganizationId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionId = sessionStorage.getItem('workflow-jk-session-id') || '';
        const auth = localStorage.getItem('workflow-jk-auth');
        
        if (auth) {
          const authState = JSON.parse(auth);
          setRole(authState.role || 'user');
          setOrganizationId(authState.organizationId || '');
        }

        const { id } = await params;
        
        const [projectData, workflowData, artifactsData] = await Promise.all([
          apiFetch<{ id: string; title: string; rawIdea: string; businessGoal: string; constraints: string[]; assumptions: string[] }>(`/api/projects/${id}`),
          apiFetch<{ id: string; state: string; currentStage: string; createdAt: string; updatedAt: string }>(`/api/projects/${id}/workflow`).catch(() => null),
          apiFetch<Array<{ id: string; type: string; version: number; summary: string; createdAt: string }>>(`/api/projects/${id}/artifacts`).catch(() => []),
        ]);
        
        setProject(projectData);
        setWorkflow(workflowData);
        setArtifacts(artifactsData);
      } catch (error) {
        console.error('Failed to load project:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params]);

  const canApproveArchitecture = role === 'org_admin' || role === 'super_admin';
  const canApproveRequirements = role === 'org_admin' || role === 'super_admin';
  const canViewSettings = role === 'super_admin';

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>{project.title}</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>{project.businessGoal}</p>

      {workflow && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Workflow Status</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span
              className="status-badge"
              style={{ background: STATE_COLORS[workflow.state] || "var(--muted)", color: "white" }}
            >
              {workflow.state}
            </span>
            <span style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Stage: {workflow.currentStage}</span>
          </div>
          
          {workflow.state === "AwaitingClarification" && (
            <a href={`/projects/${project.id}/clarification`} className="btn btn-primary" style={{ display: "inline-block", textDecoration: "none", fontSize: "0.875rem" }}>
              Answer Questions
            </a>
          )}
          {workflow.state === "RequirementsReadyForApproval" && (
            canApproveRequirements ? (
              <a href={`/projects/${project.id}/approve-requirements`} className="btn btn-primary" style={{ display: "inline-block", textDecoration: "none", fontSize: "0.875rem" }}>
                Review Requirements
              </a>
            ) : (
              <span style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                Requirements awaiting review (admin access required)
              </span>
            )
          )}
          {workflow.state === "AwaitingArchitectureApproval" && (
            canApproveArchitecture ? (
              <a href={`/projects/${project.id}/approve-architecture`} className="btn btn-primary" style={{ display: "inline-block", textDecoration: "none", fontSize: "0.875rem" }}>
                Review Architecture
              </a>
            ) : (
              <span style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                Architecture awaiting review (admin access required)
              </span>
            )
          )}
          {workflow.state === "QaInProgress" && (
            <a href={`/projects/${project.id}/qa`} className="btn btn-primary" style={{ display: "inline-block", textDecoration: "none", fontSize: "0.875rem" }}>
              View QA Results
            </a>
          )}
          {workflow.state === "ReadyForRelease" && (
            <a href={`/projects/${project.id}/qa`} className="btn btn-primary" style={{ display: "inline-block", textDecoration: "none", fontSize: "0.875rem" }}>
              Release Details
            </a>
          )}
        </div>
      )}

      {artifacts.length > 0 && (
        <div className="card">
          <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Artifacts</h2>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {artifacts.map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                <span>{a.type} v{a.version}</span>
                <span style={{ color: "var(--muted)" }}>{a.summary}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Log Link - Only visible to admin roles */}
      {(canApproveArchitecture || canApproveRequirements) && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <a href={`/projects/${project.id}/audit-logs`} style={{ textDecoration: "none", color: "var(--text)" }}>
            <strong>Audit Logs</strong>
            <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: "0.25rem 0 0 0" }}>
              View changes and approvals for this project
            </p>
          </a>
        </div>
      )}

      {/* Settings Link - Super admin only */}
      {canViewSettings && (
        <div className="card" style={{ marginTop: "0.5rem" }}>
          <a href="/settings" style={{ textDecoration: "none", color: "var(--text)" }}>
            <strong>Settings</strong>
            <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: "0.25rem 0 0 0" }}>
              System configuration
            </p>
          </a>
        </div>
      )}
    </div>
  );
}
