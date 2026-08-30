import "server-only";

import { githubClientFromToken } from "@/lib/github/client";
import { getUserSecret, saveUserSecret } from "@/lib/connect/user-vault";

export type UserGithubClient = ReturnType<typeof githubClientFromToken>;

function githubStatus(caught: unknown): number {
  return typeof caught === "object" && caught && "status" in caught
    ? Number(caught.status)
    : 500;
}

async function refreshGithubUserToken(userId: string): Promise<string | null> {
  const refreshToken = await getUserSecret(userId, "GITHUB_REFRESH_TOKEN");
  const clientId = process.env.GITHUB_APP_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET?.trim();
  if (!refreshToken || !clientId || !clientSecret) return null;
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
  } | null;
  if (!response.ok || !payload?.access_token) return null;
  await saveUserSecret(
    userId,
    "GITHUB_USER_TOKEN",
    payload.access_token,
    "github",
  );
  if (payload.refresh_token) {
    await saveUserSecret(
      userId,
      "GITHUB_REFRESH_TOKEN",
      payload.refresh_token,
      "github",
    );
  }
  return payload.access_token;
}

export async function withUserGithub<T>(
  userId: string,
  operation: (github: UserGithubClient) => Promise<T>,
): Promise<T | null> {
  const token = await getUserSecret(userId, "GITHUB_USER_TOKEN");
  if (!token) return null;
  try {
    return await operation(githubClientFromToken(token));
  } catch (caught) {
    if (githubStatus(caught) !== 401) throw caught;
    const refreshed = await refreshGithubUserToken(userId);
    if (!refreshed) throw caught;
    return operation(githubClientFromToken(refreshed));
  }
}

export function parseRepoFullName(value: string): [string, string] | null {
  const match = /^([^/\s]+)\/([^/\s]+)$/.exec(value.trim());
  return match ? [match[1], match[2]] : null;
}
