"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";

export default function ApproveRequirementsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { role, organizationId } = useAuth();
  const [requirements, setRequirements] = useState<any>(null);
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if user has permission
    if (role !== 'org_admin' && role !== 'super_admin') {
      setError("You do not have permission to approve requirements. Only organization administrators can perform this action.");
      return;
    }
    
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    fetch(`${API_BASE}/api/projects/${projectId}/artifacts/requirements`)
      .then((r) => r.json())
      .then(setRequirements)
      .catch(() => {});
  }, [projectId, role]);

  async function handleDecision(decision: string) {
    // Verify role before submission
    if (role !== 'org_admin' && role !== 'super_admin') {
      setError("Not authorized to perform this action");
      return;
    }
    
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    await fetch(`${API_BASE}/api/projects/${projectId}/approve/requirements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        decision, 
        reviewer: "web-user", 
        comments,
        organizationId,
        actor: "web-user",
        role,
      }),
    });
    router.push(`/projects/${projectId}`);
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>Review Requirements</h1>
      
      {error && (
        <div style={{ 
          background: 'var(--danger)', 
          color: 'white', 
          padding: '1rem', 
          borderRadius: '0.375rem',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {requirements && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.875rem" }}>
            {JSON.stringify(requirements.content?.requirements || [], null, 2)}
          </pre>
        </div>
      )}
      <div>
        <label>Comments</label>
        <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} />
      </div>
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
        <button onClick={() => handleDecision("approved")} className="btn btn-success">Approve</button>
        <button onClick={() => handleDecision("changes_requested")} className="btn btn-danger">Request Changes</button>
      </div>
    </div>
  );
}