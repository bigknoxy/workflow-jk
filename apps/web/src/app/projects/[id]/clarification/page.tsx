"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface Question { id: string; question: string; category: string; }

export default function ClarificationPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    fetch(`${API_BASE}/api/projects/${projectId}/clarification-questions`)
      .then((r) => r.json())
      .then((data) => setQuestions(data.questions || []));
  }, [projectId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    await fetch(`${API_BASE}/api/projects/${projectId}/clarification-answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
      }),
    });
    router.push(`/projects/${projectId}`);
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>Clarification Questions</h1>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.5rem" }}>
        {questions.map((q) => (
          <div key={q.id} className="card">
            <p style={{ fontWeight: 500, marginBottom: "0.5rem" }}>{q.question}</p>
            <span className="status-badge" style={{ background: "var(--primary)", color: "white", marginBottom: "0.5rem" }}>
              {q.category}
            </span>
            <textarea
              value={answers[q.id] || ""}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              rows={2}
              placeholder="Your answer..."
              style={{ marginTop: "0.5rem" }}
            />
          </div>
        ))}
        {questions.length > 0 && (
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Answers"}
          </button>
        )}
      </form>
    </div>
  );
}