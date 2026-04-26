import { apiFetch } from "@/lib/api";

async function getProjects() {
  try {
    return await apiFetch<Array<{ id: string; title: string; rawIdea: string; businessGoal: string }>>("/api/projects");
  } catch {
    return [];
  }
}

export default async function ProjectsPage() {
  const projects = await getProjects();
  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>Projects</h1>
      {projects.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No projects yet. Create one to get started.</p>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {projects.map((p) => (
            <a key={p.id} href={`/projects/${p.id}`} className="card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
              <h2 style={{ fontWeight: 600 }}>{p.title}</h2>
              <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>{p.businessGoal}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}