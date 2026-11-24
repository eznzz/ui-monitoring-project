import { demoFetch } from "./demo-fetch";
// Central Platform API is same-origin only. It must never receive a raw SQL
// DSN, tenant password, database name, or Tenant access token.
export type CompanyStatus = "draft" | "provisioning" | "active" | "suspended" | "disabled";
export type CompanyFilter = "all" | CompanyStatus;

export interface CompanySummary {
  tenantId: string;
  code: string;
  name: string;
  status: CompanyStatus;
  revision: number;
}
export interface CompanyProfile {
  legalName: string;
  tradeName: string;
  description: string;
  registrationNumber: string;
  taxNumber: string;
  countryCode: string;
  contactEmail: string;
  website: string;
}
export interface CompanyRecord extends CompanySummary {
  profile: CompanyProfile;
  activation?: {requestId: string; state: string};
}
export interface CompanyPage {
  companies: CompanySummary[];
  nextCursor: string;
}
// Read-only Platform review queue. The server derives the Reviewer actor
// from the signed session; this response never confers approval rights.
export interface ActivationReviewItem {
  requestId: string;
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  requesterActorId: string;
  requesterLogin: string;
  expectedRevision: number;
  createdAt: string;
  canApprove: boolean;
}
export interface ActivationReviewPage {
  requests: ActivationReviewItem[];
  nextCursor: string;
}
export interface ReviewDecisionItem {
  requestId:string;
  tenantId:string;
  tenantCode:string;
  tenantName:string;
  requesterLogin:string;
  expectedRevision:number;
  decision:"approved"|"rejected";
  decidedAt:string;
  reason:string|null;
}
export interface ReviewHistoryPage {
  decisions:ReviewDecisionItem[];
  nextCursor:string;
}
export interface ActivationReviewRejectionResult {
  state:"rejected";
  requestId:string;
  tenantId:string;
  reviewerActorId:string;
}
export interface ActivationReviewApprovalResult {
  state: "approved";
  requestId: string;
  tenantId: string;
  reviewerActorId: string;
}
export interface ActivationRequestResult {
  requestId: string;
  tenantId: string;
  state: "requested";
  expectedRevision: number;
  replayed: boolean;
}
export interface CompanyCreated {
  tenantId: string;
  code: string;
  name: string;
  status: "draft";
  replayed: boolean;
}
export type CompanyPatch = {
  expectedRevision: number;
  name?: string;
} & Partial<CompanyProfile>;
export interface C01StartReceipt {
 requestId:string;
 tenantId:string;
 state:"accepted";
}
export interface PlatformC01Receipt {
 step:string;
 state:string;
 attemptId:string;
 updatedAt:string;
}
export interface PlatformC01Status {
 requestId:string;
 tenantId:string;
 code:string;
 state:string;
 databaseName:string;
 routeEnabled:boolean;
 routingEpoch:number;
 receipts:PlatformC01Receipt[];
}
export interface PlatformLogEvent {
  at:string;
  category:string;
  eventType:string;
  outcome:string;
  subject:string;
}
export interface PlatformLogPage {
  events:PlatformLogEvent[];
  nextOffset:number|null;
}
export interface SystemServiceHealth {
 at:string;
 peers:Record<"reviewer_claim"|"reviewer_email"|"mail_operator"|"c01_operator",
   "ipc_reachable"|"ipc_unavailable"|"not_configured">;
}
export interface PlatformSelf {
  actorId: string;
  login: string;
  permissions: string[];
}
export interface PlatformAccess {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export interface ReviewerInvitationListItem {
 requestId: string;
 reviewerLogin: string;
 recipientEmail: string;
 state: "requested" | "queued" | "sent" | "claimed";
 createdAt: string;
}
export interface ReviewerInvitationListResult {
 invitations: ReviewerInvitationListItem[];
}
export interface ReviewerInvitationStatus {
 requestId: string;
 reviewerLogin: string;
 recipientEmail: string;
 state: "requested" | "queued" | "sent" | "claimed";
}
export interface ReviewerInvitationResult {
  requestId: string;
  state: "requested";
  replayed: boolean;
}
export interface ReviewerStatus {
  activeReviewers: number;
  invitationEnabled: boolean;
}

export interface ReviewerEmailPasswordSaved {
 saved: boolean;
}
export interface ReviewerOwnerConfirmationStatus {
 requestId: string;
 state: "pending" | "confirmed";
}
export interface ReviewerOwnerConfirmationReceipt {
 confirmationId: string;
 state: "confirmed";
 replayed: boolean;
}
export interface ReviewerEmailSent {
 requestId: string;
 state: "sent";
 replayed: boolean;
}

export interface ReviewerEmailOperatorTransport {
 host: string;
 port: number;
 encryption: "tls" | "starttls";
 sender: string;
 invitationRecipient: string;
}
export interface ReviewerEmailOperatorStatus {
 configured: boolean;
 enabled: boolean;
 // The operator reports its non-secret effective transport configuration.
 transport?: ReviewerEmailOperatorTransport;
}
export interface ReviewerEmailTemplate {
 linkBaseURL: string;
 subject: string;
 body: string;
 revision: number;
}
export interface PlatformMailSettings {
  host: string;
  port: number;
  encryption: "tls" | "starttls";
  tlsVerify: boolean;
  starttlsPort: number;
  imapPort: number;
  from: string;
  ownerRecipient: string;
  reviewerRecipient: string;
  credentialsConfigured: boolean;
}
export type MailOperation = "tls" | "auth" | "envelope" | "send";
export type MailRecipient = "" | "owner" | "reviewer";
export interface PlatformMailResult {
  requestId: string;
  action: MailOperation;
  recipient?: MailRecipient;
  status: "passed" | "failed";
  stage: "tls" | "greeting" | "auth" | "mail_from" |
    "rcpt_to" | "data" | "complete" | "unavailable";
  at: string;
}

export class PlatformApiError extends Error {
  constructor(readonly status: number) {
    super("Platform API returned HTTP " + status);
    this.name = "PlatformApiError";
  }
}
const root = "/api/platform/v1";

// Access JWTs live only in this page's memory. Refresh cookies stay HttpOnly;
// multiple simultaneous 401 responses must share ONE /access rotation.
let currentAccessToken: string | null = null;
let renewal: Promise<PlatformAccess> | null = null;
let sessionEpoch = 0;

async function send<T>(
  path: string, method: "GET" | "POST" | "PATCH",
  access?: string, body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (access) headers.Authorization = "Bearer " + access;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return demoFetch(root + path, {
    method, headers, cache: "no-store", credentials: "same-origin",
    redirect: "error",
    ...(body !== undefined ? {body: JSON.stringify(body)} : {}),
  });
}

async function issueAccess(): Promise<PlatformAccess> {
  const response = await send("/auth/access", "POST");
  if (!response.ok) throw new PlatformApiError(response.status);
  return response.json() as Promise<PlatformAccess>;
}

function renewAccess(): Promise<PlatformAccess> {
  if (renewal) return renewal;
  const epoch = sessionEpoch;
  const pending = issueAccess().then(issued => {
    if (epoch !== sessionEpoch) throw new PlatformApiError(401);
    currentAccessToken = issued.accessToken;
    return issued;
  });
  renewal = pending;
  void pending.then(
    () => {if (renewal === pending) renewal = null;},
    () => {if (renewal === pending) renewal = null;},
  );
  return pending;
}

async function request<T>(
  path: string, method: "GET" | "POST" | "PATCH",
  access?: string, body?: unknown,
): Promise<T> {
  let token = access ? currentAccessToken ?? access : undefined;
  let response = await send(path, method, token, body);
  if (response.status === 401 && access && path !== "/auth/access") {
    // A rejected JWT never authorized the operation. Renew once, then
    // retry with the same request UUID/body. Never retry other failures.
    token = currentAccessToken && currentAccessToken !== token
      ? currentAccessToken : (await renewAccess()).accessToken;
    response = await send(path, method, token, body);
  }
  if (!response.ok) {
    throw new PlatformApiError(response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const platform = {
  systemServices: (access:string) =>
    request<SystemServiceHealth>("/system/services","GET",access),
  c01Status: (access:string,tenantId:string) =>
    request<PlatformC01Status>("/companies/"+encodeURIComponent(tenantId)+"/provisioning","GET",access),
  c01Start: (access:string,tenantId:string,requestId:string,ownerPassword:string,totp:string) =>
    request<C01StartReceipt>(
      "/companies/"+encodeURIComponent(tenantId)+"/provisioning/start",
      "POST",access,{requestId,ownerPassword,totp}),
  platformLogs: (access:string,offset=0,limit=50) =>
    request<PlatformLogPage>("/platform-logs?offset="+offset+"&limit="+limit,"GET",access),
  me: (access: string) => request<PlatformSelf>("/me", "GET", access),
  reviewerOwnerConfirmationStatus: (access: string, requestId: string) =>
    request<ReviewerOwnerConfirmationStatus>(
      "/reviewers/invitations/"+encodeURIComponent(requestId)+"/owner-confirm",
      "GET",access),
  confirmReviewerOwner: (access: string, requestId: string,
    confirmationId: string, ownerPassword: string, totp: string) =>
    request<ReviewerOwnerConfirmationReceipt>(
      "/reviewers/invitations/owner-confirm","POST",access,
      {requestId,confirmationId,ownerPassword,totp}),
  reviewerEmailSend: (access: string, requestId: string, password: string, totp: string) =>
    request<ReviewerEmailSent>("/reviewers/invitations/email/send","POST",access,
      {requestId,password,totp}),
  reviewerEmailPasswordSave: (access: string, smtpPassword: string, ownerPassword: string, totp: string) =>
    request<ReviewerEmailPasswordSaved>("/reviewer/email/password", "POST", access,
      {smtpPassword, ownerPassword, totp}),
  reviewerEmailTemplate: (access: string) =>
    request<ReviewerEmailTemplate>("/reviewer/email/template","GET",access),
  saveReviewerEmailTemplate: (access: string, settings: ReviewerEmailTemplate,
    ownerPassword: string, totp: string) =>
    request<ReviewerEmailTemplate>("/reviewer/email/template","POST",access,
      {...settings,ownerPassword,totp}),
  reviewerEmailStatus: (access: string) =>
    request<ReviewerEmailOperatorStatus>("/reviewer/email/status", "GET", access),
  invitationList: (access: string) =>
    request<ReviewerInvitationListResult>("/reviewers/invitations","GET",access),
  invitationStatus: (access: string, id: string) =>
    request<ReviewerInvitationStatus>("/reviewers/invitations/"+encodeURIComponent(id)+"/status", "GET", access),
  reviewerStatus: (access: string) =>
    request<ReviewerStatus>("/reviewers/status", "GET", access),
  inviteReviewer: (access: string, requestId: string, reviewerLogin: string,
    recipientEmail: string, password: string, totp: string) =>
    request<ReviewerInvitationResult>("/reviewers/invitations", "POST", access,
      {requestId, reviewerLogin, recipientEmail, password, totp}),
  login: async (loginName: string, password: string, totp: string) => {
    const result = await request<void>("/auth/login", "POST", undefined, {loginName, password, totp});
    sessionEpoch++;
    currentAccessToken = null;
    renewal = null;
    return result;
  },
  // Access is requested explicitly, never in an effect: StrictMode double
  // renders must not reuse a single-use refresh cookie and revoke the session.
  access: () => renewAccess(),
  logout: async () => {
    sessionEpoch++;
    currentAccessToken = null;
    renewal = null;
    return request<void>("/auth/logout", "POST");
  },
  list: (access: string, status: CompanyFilter, after = "", limit = 20) => {
    const query = new URLSearchParams({status, limit: String(limit)});
    if (after) query.set("after", after);
    return request<CompanyPage>("/companies?" + query.toString(), "GET", access);
  },
  get: (access: string, id: string) =>
    request<CompanyRecord>("/companies/" + encodeURIComponent(id), "GET", access),
  create: (access: string, requestId: string, code: string, name: string) =>
    request<CompanyCreated>("/companies", "POST", access, {requestId, code, name}),
  edit: (access: string, id: string, patch: CompanyPatch) =>
    request<CompanyRecord>("/companies/" + encodeURIComponent(id), "PATCH", access, patch),
  requestActivation: (access: string, id: string, requestId: string, expectedRevision: number) =>
    request<ActivationRequestResult>(
      "/companies/" + encodeURIComponent(id) + "/activation-requests",
      "POST", access, {requestId, expectedRevision},
    ),
  activationReviews: (access: string, after = "", limit = 20) => {
    const query = new URLSearchParams({limit: String(limit)});
    if (after) query.set("after", after);
    return request<ActivationReviewPage>(
      "/activation-reviews?" + query.toString(), "GET", access,
    );
  },
  reviewHistory: (access: string, after = "", limit = 20) => {
    const query=new URLSearchParams({limit:String(limit)});
    if(after)query.set("after",after);
    return request<ReviewHistoryPage>(
      "/activation-reviews/history?"+query.toString(),"GET",access);
  },
  approveReview: (access: string, requestId: string, tenantId: string,
    expectedRevision: number, password: string, totp: string) =>
    request<ActivationReviewApprovalResult>(
      "/activation-reviews/" + encodeURIComponent(requestId) + "/approve",
      "POST", access, {tenantId, expectedRevision, password, totp},
    ),
  rejectReview: (access:string,requestId:string,tenantId:string,
    expectedRevision:number,reason:string,password:string,totp:string) =>
    request<ActivationReviewRejectionResult>(
      "/activation-reviews/"+encodeURIComponent(requestId)+"/reject",
      "POST",access,{tenantId,expectedRevision,reason,password,totp}),
  // Privileged Platform mail operations never receive a browser-supplied
  // SMTP host, username, password, raw message or arbitrary recipient.
  mailSettings: (access: string) =>
    request<PlatformMailSettings>("/mail/settings", "GET", access),
  mailDiagnostic: (access: string, requestId: string,
    action: MailOperation, recipient: MailRecipient, password: string, totp: string) =>
    request<PlatformMailResult>("/mail/diagnostics", "POST", access,
      {requestId, action, recipient, password, totp}),
};
