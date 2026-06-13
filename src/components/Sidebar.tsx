import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

const navStyle = (isActive: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 12px",
  borderRadius: "var(--radius)",
  color: isActive ? "var(--text)" : "var(--text-muted)",
  background: isActive ? "var(--surface-2)" : "transparent",
  fontWeight: isActive ? 500 : 400,
  transition: "all 0.15s",
  cursor: "pointer",
});

export default function Sidebar() {
  const navigate = useNavigate();
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: api.projects.list,
  });

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        height: "100vh",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "16px 8px",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "4px 12px 16px",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "-0.5px",
          color: "var(--accent)",
        }}
      >
        Atelier
      </div>

      {/* New project button */}
      <button
        onClick={() => navigate("/projects")}
        style={{
          margin: "0 4px 16px",
          padding: "8px 12px",
          background: "var(--accent)",
          color: "#fff",
          borderRadius: "var(--radius)",
          fontWeight: 500,
          fontSize: 13,
        }}
      >
        + Nouveau projet
      </button>

      {/* Nav links */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <NavLink to="/projects" style={({ isActive }) => navStyle(isActive)}>
          📂 Projets
        </NavLink>
        <NavLink to="/settings" style={({ isActive }) => navStyle(isActive)}>
          ⚙️ Paramètres
        </NavLink>
      </nav>

      {/* Recent projects */}
      {projects && projects.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              padding: "0 12px 8px",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: "var(--text-muted)",
            }}
          >
            Récents
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {projects.slice(0, 8).map((p) => (
              <NavLink
                key={p.id}
                to={`/projects/${p.id}`}
                style={({ isActive }) => ({
                  ...navStyle(isActive),
                  fontSize: 13,
                  padding: "6px 12px",
                })}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: p.status === "active" ? "var(--success)" : "var(--text-muted)",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                </span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
