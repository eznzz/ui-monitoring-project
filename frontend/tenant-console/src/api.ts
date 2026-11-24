import { demoFetch } from "./demo-fetch";
export type UUID = string;
export interface Credentials { company: string; login: string; password: string }
export interface Session { accessToken: string; refreshToken: string; sessionId: string }
export interface User { id: UUID; login: string; displayName: string; active: boolean; revision: number }
export interface Role { id: UUID; code: string; description: string; active: boolean; revision: number }
export interface Assignment { id: UUID; userId: UUID; roleId: UUID; objectId: UUID | null; objectCode?: string | null; revision: number }
export interface List<T> { items: T[] }
export interface Policy { revision: number }
export interface TenantLanguage { code: string; name: string; isPrimary: boolean; isEnabled: boolean; sortOrder: number }
export interface LanguageRegistry { primary: string; languages: TenantLanguage[] }
export interface Company { id: UUID; code: string; name: string; legalName?: string; tradeName?: string; status?: string }
export interface Module { code: string; nameEn: string; nameRu?: string; status: string; enabled: boolean }
export interface CompanyResult { company: Company; modules: Module[] }
export interface ObjectItem { id: UUID; code: string; objectTypeId?: string; revision: number }
export interface MutationResult { id: UUID; login: string; displayName: string; active: boolean; revision: number; policyRevision: number }

export class HttpFailure extends Error {
  constructor(public readonly status: number, public readonly path: string,
              public readonly code: string | null = null) {
    super("HTTP " + status);
    this.name = "HttpFailure";
  }
}
async function request<T>(path: string, method: string, body?: unknown, token?: string): Promise<T> {
  const headers: Record<string,string> = {};
  if (token) headers.Authorization = "Bearer " + token;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const result = await demoFetch(path, {
    method, headers, cache: "no-store", credentials: "same-origin",
    ...(body !== undefined ? {body: JSON.stringify(body)} : {})
  });
  if (!result.ok) {
    // Interpret only an explicit stable error code; never show untrusted server
    // details as HTML or use a client-side disabled-account guess.
    let code: string | null = null;
    if (result.headers.get("Content-Type")?.includes("application/json")) {
      const body: unknown = await result.json().catch(() => null);
      if (body && typeof body === "object" && "code" in body &&
          typeof body.code === "string") code = body.code;
    }
    throw new HttpFailure(result.status, path, code);
  }
  if (result.status === 204) return undefined as T;
  return result.json() as Promise<T>;
}
export const api = {
  login: (v: Credentials) => request<Session>("/api/v1/login", "POST", v),
  refresh: (company: string, session: Session) =>
    request<Session>("/api/v1/session/refresh", "POST",
      {company, sessionId: session.sessionId, refreshToken: session.refreshToken}),
  logout: (token: string) => request<void>("/api/v1/logout", "POST", undefined, token),
  users: (token: string) => request<List<User>>("/api/v1/tenant-admin/users", "GET", undefined, token),
  roles: (token: string) => request<List<Role>>("/api/v1/tenant-admin/roles", "GET", undefined, token),
  assignments: (token: string) => request<List<Assignment>>("/api/v1/tenant-admin/assignments", "GET", undefined, token),
  assignmentCapability: (token: string) => request<{canManage: boolean}>("/api/v1/tenant-admin/assignment-capabilities", "GET", undefined, token),
  grantAssignment: (token: string, body: {userId: UUID;roleId: UUID;objectId: UUID|null;policyRevision: number}) =>
    request<Policy>("/api/v1/tenant-admin/assignments", "POST", body, token),
  revokeAssignment: (token: string, id: UUID, body: {policyRevision: number;assignmentRevision: number}) =>
    request<Policy>("/api/v1/tenant-admin/assignments/"+encodeURIComponent(id), "DELETE", body, token),
  policy: (token: string) => request<Policy>("/api/v1/tenant-admin/policy", "GET", undefined, token),
  languages: (token: string) => request<LanguageRegistry>("/api/v1/tenant/languages", "GET", undefined, token),
  company: (token: string) => request<CompanyResult>("/api/v1/company", "GET", undefined, token),
  objects: (token: string) => request<List<ObjectItem>>("/api/v1/objects", "GET", undefined, token),
  objectByID: (token: string, id: UUID) => request<ObjectItem>("/api/v1/objects/" + encodeURIComponent(id),"GET",undefined,token),
  createUser: (token: string, body: {login: string; displayName: string; password: string; policyRevision: number}) =>
    request<MutationResult>("/api/v1/tenant-admin/users", "POST", body, token),
  updateUser: (token: string, id: UUID, body: {revision: number; policyRevision: number; displayName?: string; active?: boolean}) =>
    request<MutationResult>("/api/v1/tenant-admin/users/" + encodeURIComponent(id), "PATCH", body, token)
};
