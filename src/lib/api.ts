// ── Types ──────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: number;
  name: string | null;
  job_title: string | null;
  description: string | null;
  preferences: Record<string, unknown>;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectSummary {
  id: number;
  name: string;
  description: string | null;
  status: "active" | "archived" | "completed";
  file_count: number;
  decision_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: number;
  project_id: number;
  filename: string;
  file_type: string | null;
  file_size: number | null;
  indexed: boolean;
  created_at: string;
}

export interface Decision {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  rationale: string | null;
  status: "pending" | "taken" | "rejected";
  source: "manual" | "agent";
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  context: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  files: ProjectFile[];
  decisions: Decision[];
}

export interface Message {
  id: number;
  conversation_id: number;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tokens_used: number;
  model_used: string | null;
  created_at: string;
}

export interface ConversationSummary {
  id: number;
  project_id: number;
  title: string | null;
  message_count: number;
  created_at: string;
}

export interface Conversation {
  id: number;
  project_id: number;
  title: string | null;
  created_at: string;
  messages: Message[];
}

export interface AIModelConfig {
  id: number;
  name: string;
  provider: string;
  model_id: string;
  api_base: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface TokenUsage {
  project_id: number;
  total_tokens_input: number;
  total_tokens_output: number;
  total_tokens: number;
  estimated_cost_usd: number;
}

// ── API Client ─────────────────────────────────────────────────────────────────

const BASE = "http://localhost:8000/api/v1";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = (await res.json()).detail ?? msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  projects: {
    list: () => req<ProjectSummary[]>("/projects"),
    get: (id: number) => req<Project>(`/projects/${id}`),
    create: (data: { name: string; description?: string }) =>
      req<Project>("/projects", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<{ name: string; description: string; context: string; status: string }>) =>
      req<Project>(`/projects/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => req<void>(`/projects/${id}`, { method: "DELETE" }),

    decisions: {
      list: (projectId: number) => req<Decision[]>(`/projects/${projectId}/decisions`),
      create: (projectId: number, data: { title: string; description?: string; rationale?: string; status?: string }) =>
        req<Decision>(`/projects/${projectId}/decisions`, { method: "POST", body: JSON.stringify(data) }),
      update: (projectId: number, decisionId: number, data: Partial<Decision>) =>
        req<Decision>(`/projects/${projectId}/decisions/${decisionId}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (projectId: number, decisionId: number) =>
        req<void>(`/projects/${projectId}/decisions/${decisionId}`, { method: "DELETE" }),
    },
  },

  files: {
    list: (projectId: number) => req<ProjectFile[]>(`/projects/${projectId}/files`),
    upload: (projectId: number, file: File) => {
      const form = new FormData();
      form.append("file", file);
      return req<ProjectFile>(`/projects/${projectId}/files`, {
        method: "POST",
        body: form,
        headers: {},  // Let browser set Content-Type for multipart
      });
    },
    delete: (projectId: number, fileId: number) =>
      req<void>(`/projects/${projectId}/files/${fileId}`, { method: "DELETE" }),
  },

  chat: {
    listConversations: (projectId: number) =>
      req<ConversationSummary[]>(`/projects/${projectId}/conversations`),
    getConversation: (projectId: number, convId: number) =>
      req<Conversation>(`/projects/${projectId}/conversations/${convId}`),
    createConversation: (projectId: number, title?: string) =>
      req<Conversation>(`/projects/${projectId}/conversations`, {
        method: "POST",
        body: JSON.stringify({ title: title ?? null }),
      }),
    deleteConversation: (projectId: number, convId: number) =>
      req<void>(`/projects/${projectId}/conversations/${convId}`, { method: "DELETE" }),
    getTokenUsage: (projectId: number) => req<TokenUsage>(`/projects/${projectId}/token-usage`),
  },

  settings: {
    getProfile: () => req<UserProfile>("/settings/profile"),
    updateProfile: (data: Partial<UserProfile>) =>
      req<UserProfile>("/settings/profile", { method: "PUT", body: JSON.stringify(data) }),
    listModels: () => req<AIModelConfig[]>("/settings/models"),
    createModel: (data: { name: string; provider: string; model_id: string; api_key?: string; api_base?: string; is_default?: boolean }) =>
      req<AIModelConfig>("/settings/models", { method: "POST", body: JSON.stringify(data) }),
    updateModel: (id: number, data: Partial<AIModelConfig & { api_key: string }>) =>
      req<AIModelConfig>(`/settings/models/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteModel: (id: number) => req<void>(`/settings/models/${id}`, { method: "DELETE" }),
  },

  agents: {
    analyze: (projectId: number) =>
      req<{ context: string }>(`/projects/${projectId}/analyze`, { method: "POST" }),
    runTask: (projectId: number, task: string) =>
      req<{ result: string }>(`/projects/${projectId}/agents/run`, {
        method: "POST",
        body: JSON.stringify({ task }),
      }),
    search: (projectId: number, query: string, limit = 5) =>
      req<{ results: Array<{ filename: string; text: string; score: number }> }>(
        `/projects/${projectId}/search`,
        { method: "POST", body: JSON.stringify({ query, limit }) }
      ),
  },
};

// ── SSE streaming helper ───────────────────────────────────────────────────────

export async function* streamMessage(
  projectId: number,
  convId: number,
  content: string
): AsyncGenerator<{ type: string; content?: string; message_id?: number; message?: string }> {
  const res = await fetch(`${BASE}/projects/${projectId}/conversations/${convId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, role: "user" }),
  });

  if (!res.ok || !res.body) {
    yield { type: "error", message: `HTTP ${res.status}` };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const raw = line.slice(6).trim();
        try {
          yield JSON.parse(raw);
        } catch { /* malformed chunk */ }
      }
    }
  }
}
