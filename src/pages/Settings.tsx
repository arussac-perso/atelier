import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type AIModelConfig } from "../lib/api";

const PROVIDERS = [
  { value: "openai", label: "OpenAI", placeholder: "gpt-4o" },
  { value: "anthropic", label: "Anthropic", placeholder: "claude-3-5-sonnet-20241022" },
  { value: "ollama", label: "Ollama (local)", placeholder: "llama3.2" },
  { value: "custom", label: "Autre / LiteLLM", placeholder: "provider/model-name" },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  color: "var(--text)",
  fontSize: 14,
};

export default function Settings() {
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState<"profile" | "models">("profile");

  const sectionStyle = (s: string): React.CSSProperties => ({
    padding: "8px 14px",
    borderRadius: "var(--radius)",
    background: activeSection === s ? "var(--surface-2)" : "transparent",
    color: activeSection === s ? "var(--text)" : "var(--text-muted)",
    cursor: "pointer",
    fontWeight: activeSection === s ? 500 : 400,
    fontSize: 14,
    textAlign: "left",
    width: "100%",
    border: "none",
  });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Left nav */}
      <aside
        style={{
          width: 180,
          borderRight: "1px solid var(--border)",
          padding: "24px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={{ padding: "0 4px 12px", fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>
          Paramètres
        </div>
        <button onClick={() => setActiveSection("profile")} style={sectionStyle("profile")}>
          👤 Profil
        </button>
        <button onClick={() => setActiveSection("models")} style={sectionStyle("models")}>
          🤖 Modèles IA
        </button>
      </aside>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
        {activeSection === "profile" && <ProfileSection />}
        {activeSection === "models" && <ModelsSection />}
      </div>
    </div>
  );
}

// ── Profile ────────────────────────────────────────────────────────────────────

function ProfileSection() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: api.settings.getProfile });
  const [form, setForm] = useState({ name: "", job_title: "", description: "" });
  const [dirty, setDirty] = useState(false);

  // Sync form with loaded profile
  const [synced, setSynced] = useState(false);
  if (profile && !synced) {
    setForm({
      name: profile.name ?? "",
      job_title: profile.job_title ?? "",
      description: profile.description ?? "",
    });
    setSynced(true);
  }

  const update = useMutation({
    mutationFn: () => api.settings.updateProfile({ ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      setDirty(false);
    },
  });

  const handleChange = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ fontWeight: 600, marginBottom: 6 }}>Profil utilisateur</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: 28, fontSize: 13 }}>
        Ces informations permettent à Atelier de personnaliser les analyses et le contexte de vos projets.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Field label="Nom">
          <input value={form.name} onChange={(e) => handleChange("name", e.target.value)} style={inputStyle} placeholder="Votre nom" />
        </Field>
        <Field label="Titre / Fonction">
          <input value={form.job_title} onChange={(e) => handleChange("job_title", e.target.value)} style={inputStyle} placeholder="Ex : Consultant en transport" />
        </Field>
        <Field label="Description de votre activité et besoins">
          <textarea
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            style={{ ...inputStyle, minHeight: 140, resize: "vertical" }}
            placeholder="Décrivez votre métier, vos types de projets, ce que vous attendez d'Atelier…"
          />
        </Field>

        {update.isSuccess && !dirty && (
          <div style={{ color: "var(--success)", fontSize: 13 }}>✓ Profil sauvegardé</div>
        )}

        <button
          onClick={() => update.mutate()}
          disabled={!dirty || update.isPending}
          style={{
            alignSelf: "flex-start",
            padding: "9px 20px",
            background: dirty ? "var(--accent)" : "var(--surface-2)",
            color: dirty ? "#fff" : "var(--text-muted)",
            borderRadius: "var(--radius)",
            fontWeight: 500,
          }}
        >
          {update.isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

// ── Models ─────────────────────────────────────────────────────────────────────

function ModelsSection() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    provider: "openai",
    model_id: "",
    api_key: "",
    api_base: "",
    is_default: false,
  });

  const { data: models } = useQuery({ queryKey: ["models"], queryFn: api.settings.listModels });

  const createMutation = useMutation({
    mutationFn: () =>
      api.settings.createModel({
        name: form.name,
        provider: form.provider,
        model_id: form.model_id,
        api_key: form.api_key || undefined,
        api_base: form.api_base || undefined,
        is_default: form.is_default,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["models"] });
      setShowAdd(false);
      setForm({ name: "", provider: "openai", model_id: "", api_key: "", api_base: "", is_default: false });
    },
  });

  const setDefault = useMutation({
    mutationFn: (id: number) => api.settings.updateModel(id, { is_default: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.settings.deleteModel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models"] }),
  });

  const selectedProvider = PROVIDERS.find((p) => p.value === form.provider);

  return (
    <div style={{ maxWidth: 660 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h2 style={{ fontWeight: 600 }}>Modèles IA</h2>
        <button
          onClick={() => setShowAdd(true)}
          style={{ padding: "8px 16px", background: "var(--accent)", color: "#fff", borderRadius: "var(--radius)", fontWeight: 500, fontSize: 13 }}
        >
          + Ajouter un modèle
        </button>
      </div>
      <p style={{ color: "var(--text-muted)", marginBottom: 24, fontSize: 13 }}>
        Atelier utilise LiteLLM — compatible OpenAI, Anthropic, Ollama, et 100+ providers.
        Le modèle par défaut est utilisé pour toutes les conversations.
      </p>

      {/* Add model form */}
      {showAdd && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 20,
            marginBottom: 24,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <h3 style={{ fontWeight: 600, marginBottom: 4 }}>Nouveau modèle</h3>

          <Field label="Nom affiché">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="GPT-4o" />
          </Field>

          <Field label="Fournisseur">
            <select
              value={form.provider}
              onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
              style={inputStyle}
            >
              {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>

          <Field label="ID du modèle">
            <input
              value={form.model_id}
              onChange={(e) => setForm((f) => ({ ...f, model_id: e.target.value }))}
              style={inputStyle}
              placeholder={selectedProvider?.placeholder ?? "model-name"}
            />
          </Field>

          {form.provider !== "ollama" && (
            <Field label="Clé API">
              <input
                type="password"
                value={form.api_key}
                onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
                style={inputStyle}
                placeholder="sk-..."
                autoComplete="off"
              />
            </Field>
          )}

          {(form.provider === "ollama" || form.provider === "custom") && (
            <Field label="URL de base (API Base)">
              <input
                value={form.api_base}
                onChange={(e) => setForm((f) => ({ ...f, api_base: e.target.value }))}
                style={inputStyle}
                placeholder={form.provider === "ollama" ? "http://localhost:11434" : "https://..."}
              />
            </Field>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
            />
            Définir comme modèle par défaut
          </label>

          {createMutation.isError && (
            <div style={{ color: "var(--danger)", fontSize: 13 }}>{(createMutation.error as Error).message}</div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: "7px 14px", background: "var(--surface-2)", borderRadius: "var(--radius)", color: "var(--text)" }}>
              Annuler
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!form.name.trim() || !form.model_id.trim() || createMutation.isPending}
              style={{ padding: "7px 14px", background: "var(--accent)", color: "#fff", borderRadius: "var(--radius)", fontWeight: 500 }}
            >
              {createMutation.isPending ? "…" : "Ajouter"}
            </button>
          </div>
        </div>
      )}

      {/* Model list */}
      {models?.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", border: "1px dashed var(--border)", borderRadius: 8 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
          <p>Aucun modèle configuré. Ajoutez-en un pour commencer.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {models?.map((m: AIModelConfig) => (
          <div
            key={m.id}
            style={{
              background: "var(--surface)",
              border: `1px solid ${m.is_default ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 8,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 600 }}>{m.name}</span>
                {m.is_default && (
                  <span style={{ fontSize: 11, background: "var(--accent)", color: "#fff", padding: "2px 6px", borderRadius: 4, fontWeight: 500 }}>
                    Défaut
                  </span>
                )}
                {!m.is_active && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>(inactif)</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                {m.provider} · {m.model_id}
                {m.api_base && ` · ${m.api_base}`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {!m.is_default && (
                <button
                  onClick={() => setDefault.mutate(m.id)}
                  style={{ padding: "5px 10px", background: "var(--surface-2)", borderRadius: "var(--radius)", color: "var(--text)", fontSize: 12 }}
                >
                  Définir par défaut
                </button>
              )}
              <button
                onClick={() => { if (confirm(`Supprimer "${m.name}" ?`)) deleteMutation.mutate(m.id); }}
                style={{ color: "var(--text-muted)", background: "none", fontSize: 18 }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 13 }}>{label}</label>
      {children}
    </div>
  );
}
