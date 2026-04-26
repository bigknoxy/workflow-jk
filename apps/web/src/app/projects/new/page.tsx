"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [rawIdea, setRawIdea] = useState("");
  const [businessGoal, setBusinessGoal] = useState("");
  const [constraints, setConstraints] = useState("");
  const [assumptions, setAssumptions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${API_BASE}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          rawIdea,
          businessGoal,
          constraints: constraints ? constraints.split("\n").map((s) => s.trim()).filter(Boolean) : [],
          assumptions: assumptions ? assumptions.split("\n").map((s) => s.trim()).filter(Boolean) : [],
        }),
      });
      if (!res.ok) throw new Error("Failed to create project");
      const data = await res.json();
      router.push(`/projects/${data.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>Create New Project</h1>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem", maxWidth: "600px" }}>
        <div>
          <label htmlFor="title">Title</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="rawIdea">Raw Idea</label>
          <textarea id="rawIdea" value={rawIdea} onChange={(e) => setRawIdea(e.target.value)} rows={4} required />
        </div>
        <div>
          <label htmlFor="businessGoal">Business Goal</label>
          <input id="businessGoal" value={businessGoal} onChange={(e) => setBusinessGoal(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="constraints">Constraints (one per line)</label>
          <textarea id="constraints" value={constraints} onChange={(e) => setConstraints(e.target.value)} rows={3} />
        </div>
        <div>
          <label htmlFor="assumptions">Assumptions (one per line)</label>
          <textarea id="assumptions" value={assumptions} onChange={(e) => setAssumptions(e.target.value)} rows={3} />
        </div>
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Creating..." : "Create Project"}
        </button>
      </form>
    </div>
  );
}