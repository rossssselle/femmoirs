import { ComposerState, Post, PostInfo } from "../types";

export const pseudoUserIdStorageKey = "femmoirs.pseudo-user-id.v1";
export const voteMapStorageKey = "femmoirs.vote-map.v1";

export function createPseudoUserId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `femmoirs-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export function getPseudoUserId() {
  const existing = window.localStorage.getItem(pseudoUserIdStorageKey);
  if (existing) {
    return existing;
  }

  const next = createPseudoUserId();
  window.localStorage.setItem(pseudoUserIdStorageKey, next);
  return next;
}

export function readVoteMap() {
  const existing = window.localStorage.getItem(voteMapStorageKey);
  if (!existing) {
    return {} as Record<number, number>;
  }

  try {
    return JSON.parse(existing) as Record<number, number>;
  } catch {
    return {} as Record<number, number>;
  }
}

export function persistVoteMap(voteMap: Record<number, number>) {
  window.localStorage.setItem(voteMapStorageKey, JSON.stringify(voteMap));
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function voiceTag(pseudoUserId: string) {
  const descriptors = ["soft", "bright", "steady", "open", "tender", "clear"];
  const symbols = ["journal", "signal", "window", "memory", "current", "orbit"];
  const hash = hashString(pseudoUserId);

  return `${descriptors[hash % descriptors.length]} ${symbols[hash % symbols.length]}`;
}

export function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return value === 1 ? `1 ${singular}` : `${value} ${plural}`;
}

export function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return formatter.format(diffDays, "day");
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

export function clampText(value: string, limit: number) {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit).trimEnd()}...`;
}

async function apiFetch<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed.");
  }

  return (await response.json()) as T;
}

export async function fetchPosts() {
  const posts = await apiFetch<PostInfo[] | null>("/posts?limit=50");
  return Array.isArray(posts) ? posts : [];
}

export async function fetchPost(postId: number) {
  return apiFetch<PostInfo>(`/posts/${postId}`);
}

export async function submitModerationContact(input: {
  contact_email: string;
  subject: string;
  message: string;
}) {
  return apiFetch<{ status: string }>("/moderation-contact", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function fetchAdminPosts(adminSecret: string) {
  const posts = await apiFetch<PostInfo[] | null>("/admin/posts?limit=100", {
    headers: {
      "X-Admin-Secret": adminSecret
    }
  });
  return Array.isArray(posts) ? posts : [];
}

export async function updateAdminPostStatus(postId: number, status: string, adminSecret: string) {
  return apiFetch<Post>(`/admin/posts/${postId}`, {
    method: "PATCH",
    headers: {
      "X-Admin-Secret": adminSecret
    },
    body: JSON.stringify({ status })
  });
}

export async function createPost(input: ComposerState, pseudoUserId: string) {
  const payload = {
    title: input.title.trim() || undefined,
    body: input.body.trim()
  };

  return apiFetch<Post>("/posts", {
    method: "POST",
    headers: {
      "X-Pseudo-User-Id": pseudoUserId
    },
    body: JSON.stringify(payload)
  });
}

export async function sendVote(postId: number, vote: number, pseudoUserId: string) {
  return apiFetch<{ status?: string } | { vote: number }>(`/posts/${postId}/votes`, {
    method: "POST",
    headers: {
      "X-Pseudo-User-Id": pseudoUserId
    },
    body: JSON.stringify({ vote })
  });
}

export function applyVoteToPost(postInfo: PostInfo, previousVote: number, nextVote: number) {
  const updated = {
    ...postInfo
  };

  if (previousVote === 1) {
    updated.up_votes -= 1;
  }
  if (previousVote === -1) {
    updated.down_votes -= 1;
  }
  if (nextVote === 1) {
    updated.up_votes += 1;
  }
  if (nextVote === -1) {
    updated.down_votes += 1;
  }

  return updated;
}
