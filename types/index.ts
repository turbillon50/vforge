// types/index.ts — DTOs y tipos de dominio

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

export interface ForgeSession {
  id: string;
  scope: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VaultSecret {
  id: string;
  key: string;
  projectId: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  category: string;
  userId: string;
  vercelId?: string;
  githubRepo?: string;
  domain?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ForgeMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  sessionId: string;
  createdAt: string;
}
