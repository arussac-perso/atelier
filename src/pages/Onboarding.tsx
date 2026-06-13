import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  color: "var(--text)",
  fontSize: 14,
  resize: "vertical",
};

export default function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    job_title: "",
    description: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.settings.updateProfile({ ...form, onboarded: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      navigate("/projects");
    },
  });

  const valid = form.name.trim() && form.description.trim();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "var(--surface)",
          borderRadius: 12,
          border: "1px solid var(--border)",
          padding: 40,
        }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
          Bienvenue dans Atelier
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>
          Dites-nous qui vous êtes pour qu'Atelier puisse personnaliser votre
          expérience et contextualiser les analyses de vos projets.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
              Nom *
            </label>
            <input
              style={inputStyle}
              placeholder="Jean Dupont"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
              Titre / Fonction
            </label>
            <input
              style={inputStyle}
              placeholder="Consultant en transport maritime"
              value={form.job_title}
              onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
              Décrivez votre activité et vos besoins *
            </label>
            <textarea
              style={{ ...inputStyle, minHeight: 120 }}
              placeholder="Je suis consultant spécialisé dans les alternatives maritimes pour le transport de marchandises. J'analyse des projets de faisabilité et j'ai besoin d'aide pour synthétiser des données, rédiger des rapports et prendre des décisions éclairées..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {mutation.isError && (
            <div
              style={{
                padding: "10px 14px",
                background: "rgba(224,85,85,0.12)",
                border: "1px solid var(--danger)",
                borderRadius: "var(--radius)",
                color: "var(--danger)",
                fontSize: 13,
              }}
            >
              Erreur : {(mutation.error as Error).message}. Vérifiez que le backend est démarré.
            </div>
          )}

          <button
            type="submit"
            disabled={!valid || mutation.isPending}
            style={{
              padding: "12px 24px",
              background: valid ? "var(--accent)" : "var(--surface-2)",
              color: valid ? "#fff" : "var(--text-muted)",
              borderRadius: "var(--radius)",
              fontWeight: 600,
              fontSize: 15,
              cursor: valid ? "pointer" : "default",
              transition: "background 0.15s",
            }}
          >
            {mutation.isPending ? "Enregistrement…" : "Commencer →"}
          </button>
        </form>
      </div>
    </div>
  );
}
