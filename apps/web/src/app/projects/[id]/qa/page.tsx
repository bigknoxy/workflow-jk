"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function QaResultsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [qaReport, setQaReport] = useState<any>(null);
  const [acMatrix, setAcMatrix] = useState<any>(null);
  const [releaseDecision, setReleaseDecision] = useState<any>(null);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    fetch(`${API_BASE}/api/projects/${projectId}/artifacts/qa-report`).then((r) => r.json()).then(setQaReport).catch(() => {});
    fetch(`${API_BASE}/api/projects/${projectId}/artifacts/ac-matrix`).then((r) => r.json()).then(setAcMatrix).catch(() => {});
    fetch(`${API_BASE}/api/projects/${projectId}/artifacts/release-decision`).then((r) => r.json()).then(setReleaseDecision).catch(() => {});
  }, [projectId]);

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>QA Results</h1>
      
      {qaReport && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>QA Report</h2>
          <span
            className="status-badge"
            style={{
              background: qaReport.content?.overallStatus === "pass" ? "var(--success)" : qaReport.content?.overallStatus === "fail" ? "var(--danger)" : "var(--warning)",
              color: "white",
            }}
          >
            {qaReport.content?.overallStatus}
          </span>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>{qaReport.content?.summary}</p>
        </div>
      )}

      {acMatrix && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Acceptance Criteria Matrix</h2>
          <table style={{ width: "100%", fontSize: "0.875rem", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "0.25rem" }}>ID</th>
                <th style={{ textAlign: "left", padding: "0.25rem" }}>Description</th>
                <th style={{ textAlign: "left", padding: "0.25rem" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {acMatrix.content?.criteria?.map((c: any) => (
                <tr key={c.acId} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.25rem" }}>{c.acId}</td>
                  <td style={{ padding: "0.25rem" }}>{c.description}</td>
                  <td style={{ padding: "0.25rem" }}>
                    <span
                      className="status-badge"
                      style={{
                        background: c.status === "pass" ? "var(--success)" : c.status === "fail" ? "var(--danger)" : "var(--muted)",
                        color: "white",
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {releaseDecision && (
        <div className="card">
          <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Release Decision</h2>
          <span
            className="status-badge"
            style={{ background: releaseDecision.content?.decision === "release" ? "var(--success)" : "var(--warning)", color: "white" }}
          >
            {releaseDecision.content?.decision}
          </span>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>{releaseDecision.content?.rationale}</p>
        </div>
      )}
    </div>
  );
}