import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, streamMessage, type Message, type ConversationSummary, type Decision } from "../lib/api";

type Tab = "context" | "files" | "chat" | "decisions";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("context");

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.projects.get(projectId),
  });

  if (isLoading) return <LoadingState />;
  if (!project) return <div style={{ padding: 32, color: "var(--danger)" }}>Projet introuvable.</div>;

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: "8px 18px",
    borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
    color: tab === t ? "var(--text)" : "var(--text-muted)",
    background: "transparent",
    cursor: "pointer",
    fontWeight: tab === t ? 600 : 400,
    fontSize: 14,
    transition: "color 0.15s",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px 28px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <button onClick={() => navigate("/projects")} style={{ color: "var(--text-muted)", background: "none", fontSize: 20 }}>
          ←
        </button>
        <div>
          <h1 style={{ fontWeight: 700, fontSize: 18 }}>{project.name}</h1>
          {project.description && (
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>{project.description}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surface)", paddingLeft: 12 }}>
        {(["context", "files", "chat", "decisions"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>
            {t === "context" && "🧠 Contexte"}
            {t === "files" && "📄 Fichiers"}
            {t === "chat" && "💬 Chat"}
            {t === "decisions" && "✅ Décisions"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {tab === "context" && <ContextTab projectId={projectId} context={project.context} />}
        {tab === "files" && <FilesTab projectId={projectId} />}
        {tab === "chat" && <ChatTab projectId={projectId} />}
        {tab === "decisions" && <DecisionsTab projectId={projectId} />}
      </div>
    </div>
  );
}

// ── Context Tab ────────────────────────────────────────────────────────────────

function ContextTab({ projectId, context }: { projectId: number; context: string | null }) {
  const qc = useQueryClient();
  const [agentTask, setAgentTask] = useState("");
  const [agentResult, setAgentResult] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const analyzeMutation = useMutation({
    mutationFn: () => api.agents.analyze(projectId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  const runAgent = async () => {
    if (!agentTask.trim()) return;
    setRunning(true);
    setAgentResult(null);
    try {
      const r = await api.agents.runTask(projectId, agentTask);
      setAgentResult(r.result);
    } catch (e) {
      setAgentResult(`Erreur : ${(e as Error).message}`);
    } finally {
      setRunning(false);
    }
  };

  const { data: usage } = useQuery({
    queryKey: ["token-usage", projectId],
    queryFn: () => api.chat.getTokenUsage(projectId),
  });

  return (
    <div style={{ padding: 28, display: "flex", gap: 24, alignItems: "flex-start" }}>
      {/* Context panel */}
      <div style={{ flex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontWeight: 600 }}>Contexte du projet</h2>
          <button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            style={{ padding: "7px 14px", background: "var(--accent)", color: "#fff", borderRadius: "var(--radius)", fontWeight: 500, fontSize: 13 }}
          >
            {analyzeMutation.isPending ? "Analyse en cours…" : "🔄 Regénérer"}
          </button>
        </div>

        {analyzeMutation.isError && (
          <ErrorBox message={(analyzeMutation.error as Error).message} />
        )}

        {context ? (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 20,
              whiteSpace: "pre-wrap",
              lineHeight: 1.7,
              fontSize: 14,
            }}
          >
            {context}
          </div>
        ) : (
          <EmptyState
            icon="🧠"
            text="Aucun contexte généré."
            action="Importez des fichiers puis cliquez sur Regénérer pour analyser le projet."
          />
        )}

        {/* Token usage */}
        {usage && (
          <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-muted)" }}>
            Tokens utilisés : {usage.total_tokens.toLocaleString()} 
            {usage.estimated_cost_usd > 0 && ` · ~$${usage.estimated_cost_usd.toFixed(4)}`}
          </div>
        )}
      </div>

      {/* Agent panel */}
      <div style={{ flex: 1, minWidth: 280 }}>
        <h2 style={{ fontWeight: 600, marginBottom: 16 }}>Agent IA</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <textarea
            placeholder="Posez une question ou donnez une tâche à l'agent (il peut rechercher dans vos fichiers)…"
            value={agentTask}
            onChange={(e) => setAgentTask(e.target.value)}
            style={{
              width: "100%",
              minHeight: 100,
              padding: "10px 12px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              color: "var(--text)",
              fontSize: 13,
              resize: "vertical",
            }}
          />
          <button
            onClick={runAgent}
            disabled={running || !agentTask.trim()}
            style={{ padding: "8px 16px", background: "var(--accent)", color: "#fff", borderRadius: "var(--radius)", fontWeight: 500, fontSize: 13 }}
          >
            {running ? "Réflexion…" : "▶ Lancer l'agent"}
          </button>
          {agentResult && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 14,
                fontSize: 13,
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
                maxHeight: 400,
                overflow: "auto",
              }}
            >
              {agentResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Files Tab ─────────────────────────────────────────────────────────────────

function FilesTab({ projectId }: { projectId: number }) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: files } = useQuery({
    queryKey: ["files", projectId],
    queryFn: () => api.files.list(projectId),
  });

  const deleteMutation = useMutation({
    mutationFn: (fileId: number) => api.files.delete(projectId, fileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files", projectId] }),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.files.upload(projectId, file);
      qc.invalidateQueries({ queryKey: ["files", projectId] });
    } catch (err) {
      alert(`Erreur d'upload : ${(err as Error).message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontWeight: 600 }}>Fichiers ({files?.length ?? 0})</h2>
        <div>
          <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ padding: "8px 16px", background: "var(--accent)", color: "#fff", borderRadius: "var(--radius)", fontWeight: 500, fontSize: 13 }}
          >
            {uploading ? "Import en cours…" : "+ Importer un fichier"}
          </button>
        </div>
      </div>

      {files && files.length === 0 && (
        <EmptyState icon="📄" text="Aucun fichier importé." action="Importez des fichiers pour enrichir le contexte du projet." />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {files?.map((f) => (
          <div
            key={f.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          >
            <span style={{ fontSize: 18 }}>{fileIcon(f.file_type)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.filename}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {f.file_type ?? "—"} · {formatSize(f.file_size)}
                {" · "}
                <span style={{ color: f.indexed ? "var(--success)" : "var(--warning)" }}>
                  {f.indexed ? "✓ Indexé" : "⏳ En cours d'indexation…"}
                </span>
              </div>
            </div>
            <button
              onClick={() => { if (confirm(`Supprimer "${f.filename}" ?`)) deleteMutation.mutate(f.id); }}
              style={{ color: "var(--text-muted)", background: "none", fontSize: 18, padding: "0 4px" }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Chat Tab ──────────────────────────────────────────────────────────────────

function ChatTab({ projectId }: { projectId: number }) {
  const qc = useQueryClient();
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useQuery({
    queryKey: ["conversations", projectId],
    queryFn: () => api.chat.listConversations(projectId),
  });

  const { data: conv } = useQuery({
    queryKey: ["conversation", projectId, selectedConvId],
    queryFn: () => api.chat.getConversation(projectId, selectedConvId!),
    enabled: selectedConvId !== null,
  });

  useEffect(() => {
    if (conv) setMessages(conv.messages);
  }, [conv]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const createConv = useMutation({
    mutationFn: () => api.chat.createConversation(projectId),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["conversations", projectId] });
      setSelectedConvId(c.id);
      setMessages([]);
    },
  });

  const deleteConv = useMutation({
    mutationFn: (id: number) => api.chat.deleteConversation(projectId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations", projectId] });
      setSelectedConvId(null);
      setMessages([]);
    },
  });

  const sendMessage = async () => {
    if (!input.trim() || streaming || !selectedConvId) return;
    const content = input.trim();
    setInput("");

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: Date.now(),
      conversation_id: selectedConvId,
      role: "user",
      content,
      tokens_used: 0,
      model_used: null,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, tempUserMsg]);
    setStreaming(true);
    setStreamingContent("");

    let fullContent = "";
    try {
      for await (const event of streamMessage(projectId, selectedConvId, content)) {
        if (event.type === "chunk" && event.content) {
          fullContent += event.content;
          setStreamingContent(fullContent);
        } else if (event.type === "done") {
          const assistantMsg: Message = {
            id: event.message_id ?? Date.now() + 1,
            conversation_id: selectedConvId,
            role: "assistant",
            content: fullContent,
            tokens_used: 0,
            model_used: null,
            created_at: new Date().toISOString(),
          };
          setMessages((m) => [...m, assistantMsg]);
          setStreamingContent("");
          qc.invalidateQueries({ queryKey: ["conversations", projectId] });
        } else if (event.type === "error") {
          setMessages((m) => [
            ...m,
            {
              id: Date.now() + 1,
              conversation_id: selectedConvId,
              role: "assistant",
              content: `⚠️ Erreur : ${event.message}`,
              tokens_used: 0,
              model_used: null,
              created_at: new Date().toISOString(),
            },
          ]);
        }
      }
    } finally {
      setStreaming(false);
      setStreamingContent("");
    }
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Conversation list */}
      <div
        style={{
          width: 220,
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "12px 10px", borderBottom: "1px solid var(--border)" }}>
          <button
            onClick={() => createConv.mutate()}
            style={{
              width: "100%",
              padding: "7px 12px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              color: "var(--text)",
              fontSize: 13,
            }}
          >
            + Nouvelle conversation
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {conversations?.map((c: ConversationSummary) => (
            <div
              key={c.id}
              onClick={() => setSelectedConvId(c.id)}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                background: selectedConvId === c.id ? "var(--surface-2)" : "transparent",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.title ?? "Conversation"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.message_count} messages</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm("Supprimer cette conversation ?")) deleteConv.mutate(c.id); }}
                style={{ color: "var(--text-muted)", background: "none", fontSize: 16, padding: "0 2px" }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      {selectedConvId ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Messages */}
          <div style={{ flex: 1, overflow: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {streamingContent && (
              <MessageBubble
                message={{
                  id: -1,
                  conversation_id: selectedConvId,
                  role: "assistant",
                  content: streamingContent,
                  tokens_used: 0,
                  model_used: null,
                  created_at: new Date().toISOString(),
                }}
                streaming
              />
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "14px 20px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Votre message…"
              disabled={streaming}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              style={{
                flex: 1,
                padding: "10px 12px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                color: "var(--text)",
                fontSize: 14,
                resize: "none",
                minHeight: 44,
                maxHeight: 160,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
              style={{
                padding: "10px 18px",
                background: streaming ? "var(--surface-2)" : "var(--accent)",
                color: streaming ? "var(--text-muted)" : "#fff",
                borderRadius: "var(--radius)",
                fontWeight: 500,
                fontSize: 14,
                height: 44,
              }}
            >
              {streaming ? "…" : "Envoyer"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <EmptyState icon="💬" text="Sélectionnez ou créez une conversation." />
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, streaming }: { message: Message; streaming?: boolean }) {
  const isUser = message.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "72%",
          padding: "10px 14px",
          borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
          background: isUser ? "var(--accent)" : "var(--surface)",
          border: isUser ? "none" : "1px solid var(--border)",
          color: "var(--text)",
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {message.content}
        {streaming && <span style={{ opacity: 0.5 }}>▌</span>}
      </div>
    </div>
  );
}

// ── Decisions Tab ─────────────────────────────────────────────────────────────

function DecisionsTab({ projectId }: { projectId: number }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", rationale: "", status: "pending" as const });

  const { data: decisions } = useQuery({
    queryKey: ["decisions", projectId],
    queryFn: () => api.projects.decisions.list(projectId),
  });

  const createMutation = useMutation({
    mutationFn: () => api.projects.decisions.create(projectId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decisions", projectId] });
      setShowForm(false);
      setForm({ title: "", description: "", rationale: "", status: "pending" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.projects.decisions.update(projectId, id, { status: status as Decision["status"] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decisions", projectId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.projects.decisions.delete(projectId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decisions", projectId] }),
  });

  const STATUS_STYLES: Record<string, React.CSSProperties> = {
    pending: { background: "rgba(232,168,56,0.15)", color: "var(--warning)", border: "1px solid var(--warning)" },
    taken: { background: "rgba(76,175,125,0.15)", color: "var(--success)", border: "1px solid var(--success)" },
    rejected: { background: "rgba(224,85,85,0.15)", color: "var(--danger)", border: "1px solid var(--danger)" },
  };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontWeight: 600 }}>Décisions ({decisions?.length ?? 0})</h2>
        <button
          onClick={() => setShowForm(true)}
          style={{ padding: "8px 16px", background: "var(--accent)", color: "#fff", borderRadius: "var(--radius)", fontWeight: 500, fontSize: 13 }}
        >
          + Ajouter
        </button>
      </div>

      {showForm && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 20,
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <input
            autoFocus
            placeholder="Titre de la décision *"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            style={inputStyle}
          />
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
          />
          <textarea
            placeholder="Justification / Raisonnement"
            value={form.rationale}
            onChange={(e) => setForm((f) => ({ ...f, rationale: e.target.value }))}
            style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
          />
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as typeof f.status }))}
            style={{ ...inputStyle }}
          >
            <option value="pending">En attente</option>
            <option value="taken">Prise</option>
            <option value="rejected">Rejetée</option>
          </select>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(false)} style={{ padding: "7px 14px", background: "var(--surface-2)", borderRadius: "var(--radius)", color: "var(--text)" }}>
              Annuler
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!form.title.trim() || createMutation.isPending}
              style={{ padding: "7px 14px", background: "var(--accent)", color: "#fff", borderRadius: "var(--radius)", fontWeight: 500 }}
            >
              {createMutation.isPending ? "…" : "Ajouter"}
            </button>
          </div>
        </div>
      )}

      {decisions?.length === 0 && (
        <EmptyState icon="✅" text="Aucune décision enregistrée." action="Ajoutez des décisions prises ou à prendre pour garder une trace." />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {decisions?.map((d) => (
          <div
            key={d.id}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "14px 16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>{d.title}</div>
                {d.description && <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{d.description}</div>}
                {d.rationale && <div style={{ fontSize: 13, fontStyle: "italic", color: "var(--text-muted)" }}>↳ {d.rationale}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <select
                  value={d.status}
                  onChange={(e) => updateStatus.mutate({ id: d.id, status: e.target.value })}
                  style={{
                    ...STATUS_STYLES[d.status],
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  <option value="pending">En attente</option>
                  <option value="taken">Prise</option>
                  <option value="rejected">Rejetée</option>
                </select>
                <button
                  onClick={() => { if (confirm("Supprimer cette décision ?")) deleteMutation.mutate(d.id); }}
                  style={{ color: "var(--text-muted)", background: "none", fontSize: 18 }}
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function EmptyState({ icon, text, action }: { icon: string; text: string; action?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-muted)" }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      <p style={{ marginBottom: action ? 6 : 0 }}>{text}</p>
      {action && <p style={{ fontSize: 12 }}>{action}</p>}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        background: "rgba(224,85,85,0.12)",
        border: "1px solid var(--danger)",
        borderRadius: "var(--radius)",
        color: "var(--danger)",
        fontSize: 13,
        marginBottom: 12,
      }}
    >
      {message}
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
      Chargement…
    </div>
  );
}

function fileIcon(mimeType: string | null): string {
  if (!mimeType) return "📄";
  if (mimeType.includes("pdf")) return "📕";
  if (mimeType.includes("word") || mimeType.includes("docx")) return "📝";
  if (mimeType.includes("image")) return "🖼️";
  if (mimeType.includes("audio")) return "🎵";
  if (mimeType.includes("video")) return "🎬";
  if (mimeType.includes("json") || mimeType.includes("xml")) return "⚙️";
  if (mimeType.includes("text")) return "📄";
  return "📎";
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
