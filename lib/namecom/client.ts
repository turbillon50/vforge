/**
 * Name.com REST API client.
 *
 * Auth: HTTP basic with NAME_USERNAME (typically the registrant email)
 * + NAME_TOKEN. Both are pulled from the operator vault on demand.
 */
import { requireOperatorSecret } from "@/lib/vault/get-secret";

const NAMECOM_API = "https://api.name.com";

async function getCreds(options: { auditUserId?: string } = {}): Promise<{
  username: string;
  token: string;
}> {
  const [username, token] = await Promise.all([
    requireOperatorSecret("NAME_USERNAME", options),
    requireOperatorSecret("NAME_TOKEN", options),
  ]);
  return { username, token };
}

function basicAuthHeader(username: string, token: string): string {
  return `Basic ${Buffer.from(`${username}:${token}`).toString("base64")}`;
}

async function nameFetch(
  path: string,
  init: RequestInit & { auth: string },
): Promise<Response> {
  const res = await fetch(`${NAMECOM_API}${path}`, {
    ...init,
    headers: {
      Authorization: init.auth,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  return res;
}

async function nameJson<T>(
  path: string,
  init: RequestInit & { auth: string },
): Promise<T> {
  const res = await nameFetch(path, init);
  const text = await res.text();
  let body: T & { message?: string } = {} as T & { message?: string };
  if (text) {
    try {
      body = JSON.parse(text) as T & { message?: string };
    } catch {
      throw new Error(`name.com non-JSON response (${res.status}): ${text.slice(0, 200)}`);
    }
  }
  if (!res.ok) {
    const message = body?.message ?? `name.com ${res.status} on ${path}`;
    throw new Error(message);
  }
  return body;
}

export interface NameDomain {
  domainName: string;
  nameservers?: string[];
  expireDate?: string;
  createDate?: string;
  locked?: boolean;
  autorenewEnabled?: boolean;
  privacyEnabled?: boolean;
}

export async function listDomains(
  options: { auditUserId?: string; max?: number } = {},
): Promise<NameDomain[]> {
  const { username, token } = await getCreds(options);
  const auth = basicAuthHeader(username, token);
  const out: NameDomain[] = [];
  let page = 1;
  const perPage = 100;
  const max = options.max ?? 200;
  while (out.length < max) {
    const data = await nameJson<{
      domains?: NameDomain[];
      nextPage?: number;
    }>(`/v4/domains?perPage=${perPage}&page=${page}`, {
      method: "GET",
      auth,
    });
    const batch = data.domains ?? [];
    out.push(...batch);
    if (!data.nextPage || batch.length === 0) break;
    page = data.nextPage;
  }
  return out.slice(0, max);
}

export async function getDomain(
  domain: string,
  options: { auditUserId?: string } = {},
): Promise<NameDomain & { contacts?: unknown }> {
  const { username, token } = await getCreds(options);
  return nameJson(
    `/v4/domains/${encodeURIComponent(domain)}`,
    { method: "GET", auth: basicAuthHeader(username, token) },
  );
}

export interface NameDnsRecord {
  id: number;
  domainName: string;
  host?: string;
  fqdn: string;
  type: string;
  answer: string;
  ttl: number;
  priority?: number;
}

export async function listRecords(
  domain: string,
  options: { auditUserId?: string } = {},
): Promise<NameDnsRecord[]> {
  const { username, token } = await getCreds(options);
  const data = await nameJson<{ records?: NameDnsRecord[] }>(
    `/v4/domains/${encodeURIComponent(domain)}/records`,
    { method: "GET", auth: basicAuthHeader(username, token) },
  );
  return data.records ?? [];
}

export interface UpsertRecordInput {
  host?: string; // empty / omit for apex
  type: "A" | "AAAA" | "CNAME" | "TXT" | "MX" | "NS";
  answer: string;
  ttl?: number;
  priority?: number;
}

/**
 * Upsert a record by (host, type) — deletes any existing match first
 * then creates the new one. Idempotent for the common case of pointing
 * a hostname at a single target.
 */
export async function upsertRecord(
  domain: string,
  input: UpsertRecordInput,
  options: { auditUserId?: string } = {},
): Promise<NameDnsRecord> {
  const { username, token } = await getCreds(options);
  const auth = basicAuthHeader(username, token);
  const host = (input.host ?? "").trim();
  const type = input.type;

  const existing = await nameJson<{ records?: NameDnsRecord[] }>(
    `/v4/domains/${encodeURIComponent(domain)}/records`,
    { method: "GET", auth },
  );
  for (const r of existing.records ?? []) {
    const rh = r.host ?? "";
    if (rh === host && r.type === type) {
      await nameFetch(
        `/v4/domains/${encodeURIComponent(domain)}/records/${r.id}`,
        { method: "DELETE", auth },
      );
    }
  }

  const created = await nameJson<NameDnsRecord>(
    `/v4/domains/${encodeURIComponent(domain)}/records`,
    {
      method: "POST",
      auth,
      body: JSON.stringify({
        host,
        type,
        answer: input.answer,
        ttl: input.ttl ?? 300,
        ...(typeof input.priority === "number" ? { priority: input.priority } : {}),
      }),
    },
  );
  return created;
}

export async function deleteRecord(
  domain: string,
  recordId: number,
  options: { auditUserId?: string } = {},
): Promise<{ ok: boolean }> {
  const { username, token } = await getCreds(options);
  const res = await nameFetch(
    `/v4/domains/${encodeURIComponent(domain)}/records/${recordId}`,
    { method: "DELETE", auth: basicAuthHeader(username, token) },
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`name.com ${res.status} deleting record ${recordId}`);
  }
  return { ok: true };
}
