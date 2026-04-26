"use client";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useEffect, useState } from "react";

export default function TasksPage() {
  const { role } = useAuth();
  const [tasks, setTasks] = useState<Array<{ id: string; projectId: string; title: string; status: string; priority: string }>>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTasks = async () => {
      if (role === 'user') {
        setError("Tasks feature is currently restricted to organization administrators and above.");
        return;
      }
      
      try {
        const data = await apiFetch<Array<{ id: string; projectId: string; title: string; status: string; priority: string }>>("/api/tasks");
        setTasks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tasks");
      }
    };
    fetchTasks();
  }, [role]);

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>Tasks</h1>
      
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

      {tasks.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No tasks yet. Create one to get started.</p>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {tasks.map((t) => (
            <a key={t.id} href={`/tasks/${t.id}`} className="card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
              <h2 style={{ fontWeight: 600 }}>{t.title}</h2>
              <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem" }}>
                <span style={{ color: "var(--muted)" }}>Status: {t.status}</span>
                <span style={{ color: "var(--muted)" }}>Priority: {t.priority}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
