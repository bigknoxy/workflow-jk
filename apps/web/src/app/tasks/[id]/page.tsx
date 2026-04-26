import { apiFetch } from "@/lib/api";
import { notFound } from "next/navigation";

async function getTask(id: string) {
  try {
    return await apiFetch<{ id: string; projectId: string; title: string; description?: string; status: string; priority: string }>(`/api/tasks/${id}`);
  } catch {
    return null;
  }
}

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getTask(id);
  if (!task) {
    notFound();
  }

  return (
    <div>
      <a href="/tasks" style={{ textDecoration: "none", color: "var(--muted)", marginBottom: "1rem", display: "block" }}>
        ← Back to tasks
      </a>
      
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1rem" }}>{task.title}</h1>
      
      {task.description && (
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>{task.description}</p>
      )}
      
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <span style={{ 
          backgroundColor: "var(--muted-100)", 
          color: "var(--muted-800)",
          padding: "0.25rem 0.75rem",
          borderRadius: "9999px",
          fontSize: "0.875rem",
          fontWeight: 500
        }}>
          Status: {task.status}
        </span>
        <span style={{ 
          backgroundColor: "var(--muted-100)", 
          color: "var(--muted-800)",
          padding: "0.25rem 0.75rem",
          borderRadius: "9999px",
          fontSize: "0.875rem",
          fontWeight: 500
        }}>
          Priority: {task.priority}
        </span>
      </div>
    </div>
  );
}
