export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
import { toast } from "@/components/ui/sonner";
import { ChatMessage, ChatRoom, PlatformSetupInstruction, ProjectOnboarding } from "@/types/jira";

export const TOKEN_KEY = "jira_api_token";
const USER_KEY = "jira_current_user";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getNotificationsWsUrl(token: string): string {
  const apiUrl = new URL(API_BASE);
  const wsProtocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  const wsBase = `${wsProtocol}//${apiUrl.host}`;
  return `${wsBase}/ws/notifications/?token=${encodeURIComponent(token)}`;
}

export function getChatWsUrl(token: string, roomId: string): string {
  const apiUrl = new URL(API_BASE);
  const wsProtocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  const wsBase = `${wsProtocol}//${apiUrl.host}`;
  return `${wsBase}/ws/chat/${encodeURIComponent(roomId)}/?token=${encodeURIComponent(token)}`;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

function getCurrentUserRole(): string | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { role?: string };
    return parsed.role || null;
  } catch {
    return null;
  }
}

function buildPermissionReason(
  path: string,
  role: string | null,
  backendMessage: string,
): string {
  const methodArea = (() => {
    if (path.startsWith("/users/")) return "user management";
    if (path.startsWith("/projects/")) return "workspace management";
    if (path.startsWith("/sprints/")) return "sprint management";
    if (path.startsWith("/epics/")) return "epic management";
    if (path.startsWith("/issues/")) return "issue operation";
    return "this operation";
  })();

  if (role === "viewer") {
    return `Your role is Viewer (read-only), so you cannot perform ${methodArea}.`;
  }
  if (path.startsWith("/users/") || path.startsWith("/projects/")) {
    return `Only Admin users can perform ${methodArea}.`;
  }
  if (path.startsWith("/sprints/") || path.startsWith("/epics/")) {
    return `Only Admin or Project Manager roles can perform ${methodArea}.`;
  }
  if (path.startsWith("/issues/")) {
    return "You can edit an issue only if you are Admin/Project Manager, or the issue assignee/reporter (Developer rule).";
  }
  return backendMessage || "You do not have permission for this action.";
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Token ${token}`;
  }

  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        throw new Error(
          `Expected JSON from API but got HTML. Check backend route/server for ${url}.`,
        );
      }
      throw new Error(`Unexpected non-JSON response from ${url}`);
    }
  }

  if (!res.ok) {
    const message =
      typeof data === "object" && data
        ? (data as { detail?: string; error?: string }).detail ||
          (data as { detail?: string; error?: string }).error ||
          "Request failed"
        : "Request failed";
    if (res.status === 403) {
      const role = getCurrentUserRole();
      const reason = buildPermissionReason(path, role, message);
      toast.error("Action not allowed", { description: reason });
    }
    throw new Error(message);
  }

  return data as T;
}

export type OnboardingResponse = {
  exists: boolean;
  canEdit: boolean;
  onboarding: ProjectOnboarding | null;
};

export async function getProjectOnboarding(projectId: string) {
  return apiRequest<OnboardingResponse>(`/projects/${projectId}/onboarding/`);
}

export async function upsertProjectOnboarding(
  projectId: string,
  payload: {
    overview?: string;
    repositoryUrl?: string;
    prerequisites?: string;
  },
) {
  return apiRequest<OnboardingResponse>(`/projects/${projectId}/onboarding/`, {
    method: "PUT",
    body: payload,
  });
}

export async function createPlatformSetupInstruction(
  projectId: string,
  payload: {
    platform: "windows" | "linux" | "macos" | "other";
    title: string;
    content: string;
    displayOrder?: number;
  },
) {
  return apiRequest<PlatformSetupInstruction>(
    `/projects/${projectId}/onboarding/instructions/`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function updatePlatformSetupInstruction(
  instructionId: string,
  payload: {
    platform: "windows" | "linux" | "macos" | "other";
    title: string;
    content: string;
    displayOrder?: number;
  },
) {
  return apiRequest<PlatformSetupInstruction>(
    `/onboarding-instructions/${instructionId}/`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export async function deletePlatformSetupInstruction(instructionId: string) {
  return apiRequest<void>(`/onboarding-instructions/${instructionId}/`, {
    method: "DELETE",
  });
}

export async function listChatRooms(params: { type?: "dm" | "channel"; projectId?: string } = {}) {
  const query = new URLSearchParams();
  if (params.type) query.set("type", params.type);
  if (params.projectId) query.set("project_id", params.projectId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<ChatRoom[]>(`/chat/rooms/${suffix}`);
}

export async function createDirectMessageRoom(payload: { targetUserId: string }) {
  return apiRequest<ChatRoom>("/chat/dms/", {
    method: "POST",
    body: payload,
  });
}

export async function createChannel(payload: {
  projectId?: string;
  name: string;
  memberIds?: string[];
  isPrivate?: boolean;
}) {
  return apiRequest<ChatRoom>("/chat/channels/", {
    method: "POST",
    body: payload,
  });
}

export async function listRoomMessages(roomId: string, before?: string) {
  const query = before ? `?before=${encodeURIComponent(before)}` : "";
  return apiRequest<ChatMessage[]>(`/chat/rooms/${roomId}/messages/${query}`);
}

export async function createRoomMessage(roomId: string, content: string) {
  return apiRequest<ChatMessage>(`/chat/rooms/${roomId}/messages/`, {
    method: "POST",
    body: { content },
  });
}

export async function editRoomMessage(messageId: string, content: string) {
  return apiRequest<ChatMessage>(`/chat/messages/${messageId}/`, {
    method: "PATCH",
    body: { content },
  });
}

export async function deleteRoomMessage(messageId: string) {
  return apiRequest<ChatMessage>(`/chat/messages/${messageId}/`, {
    method: "DELETE",
  });
}

export async function markRoomRead(roomId: string, messageId?: string) {
  return apiRequest<{ success: boolean }>(`/chat/rooms/${roomId}/read/`, {
    method: "POST",
    body: { messageId },
  });
}
