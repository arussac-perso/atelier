import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ProjectSummary } from "../lib/api";

const STATUS_COLOR: Record<string, string> = {
  active: "var(--success)",
  archived: "var(--text-muted)",
  completed: "var(--accent)",
};

export default function Projects() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["projects"],
    queryFn: api.projects.list,
  });

  const createMutation = useMutation({
    mutationFn: () => api.projects.create({ name: form.name.trim(), description: form.description.trim() || undefined }),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setShowCreate(false);
      setForm({ name: "", description: "" });
      navigate(`/projects/${project.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.projects.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Projets</h1>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: "8px 16px",
            background: "var(--accent)",
            color: "#fff",
            borderRadius: "var(--radius)",
            fontWeight: 500,
          }}
        >
          + Nouveau projet
        </button>
      </div>

      {/* Create project modal */}
      {showCreate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => setShowCreate(false)}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 32,
              width: 440,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: 20, fontWeight: 600 }}>Créer un projet</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (form.name.trim()) createMutation.mutate();
              }}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <input
                autoFocus
                placeholder="Nom du projet *"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                style={inputStyle}
              />
              <textarea
                placeholder="Description (optionnelle)"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  style={{ padding: "8px 16px", background: "var(--surface-2)", borderRadius: "var(--radius)", color: "var(--text)" }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!form.name.trim() || createMutation.isPending}
                  style={{ padding: "8px 16px", background: "var(--accent)", borderRadius: "var(--radius)", color: "#fff", fontWeight: 500 }}
                >
                  {createMutation.isPending ? "Création…" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project list */}
      {isLoading && <p style={{ color: "var(--text-muted)" }}>Chargement…</p>}
      {error && <p style={{ color: "var(--danger)" }}>Impossible de contacter le backend. Démarrez-le avec : npm run backend:dev</p>}

      {projects && projects.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--text-muted)",
            border: "1px dashed var(--border)",
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
          <p style={{ marginBottom: 16 }}>Aucun projet pour l'instant.</p>
          <button
            onClick={() => setShowCreate(true)}
            style={{ padding: "8px 20px", background: "var(--accent)", color: "#fff", borderRadius: "var(--radius)" }}
          >
            Créer votre premier projet
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {projects?.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            onClick={() => navigate(`/projects/${p.id}`)}
            onDelete={() => {
              if (confirm(`Supprimer le projet "${p.name}" ?`)) deleteMutation.mutate(p.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  onClick,
  onDelete,
}: {
  project: ProjectSummary;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 20,
        cursor: "pointer",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            color: STATUS_COLOR[project.status] ?? "var(--text-muted)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLOR[project.status] }} />
          {project.status}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            padding: "2px 6px",
            background: "transparent",
            color: "var(--text-muted)",
            borderRadius: 4,
            fontSize: 16,
          }}
          title="Supprimer"
        >
          ×
        </button>
      </div>

      <h3 style={{ fontWeight: 600, marginBottom: 6, fontSize: 15 }}>{project.name}</h3>
      {project.description && (
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12, lineHeight: 1.4 }}>
          {project.description.slice(0, 100)}{project.description.length > 100 ? "…" : ""}
        </p>
      )}

      <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
        <span>📄 {project.file_count} fichier{project.file_count !== 1 ? "s" : ""}</span>
        <span>✓ {project.decision_count} décision{project.decision_count !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  color: "var(--text)",
  fontSize: 14,
};
