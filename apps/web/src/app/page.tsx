export default function Home() {
  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>Workflow JK</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        Supervised multi-agent software delivery platform. Submit a business idea and watch it become production-ready software.
      </p>
      <a href="/projects/new" className="btn btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
        Create New Project
      </a>
    </div>
  );
}