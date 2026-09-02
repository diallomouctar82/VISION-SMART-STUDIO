import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "npm:@supabase/supabase-js@2.112.4";

const ALLOWED_ORIGINS = new Set([
  "https://vision-smart-studio-preview.netlify.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);
const ALLOWED_ROLES = new Set(["admin", "operator", "auditor", "viewer"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function response(origin: string | null, status: number, payload: Record<string, unknown>): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Vary", "Origin");
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

async function findUserByEmail(
  adminClient: ReturnType<typeof createClient>,
  email: string,
): Promise<User | null> {
  for (let page = 1; page <= 10; page += 1) {
    const result = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) throw result.error;
    const user = result.data.users.find((candidate) => candidate.email?.toLocaleLowerCase("en") === email);
    if (user) return user;
    if (result.data.users.length < 1000) return null;
  }
  throw new Error("USER_DIRECTORY_LIMIT_REACHED");
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return response(null, 403, { error: "ORIGIN_NOT_ALLOWED" });
  if (request.method === "OPTIONS") return response(origin, 200, {});
  if (request.method !== "POST") return response(origin, 405, { error: "METHOD_NOT_ALLOWED" });

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return response(origin, 401, { error: "AUTHENTICATION_REQUIRED" });

  const contentLength = Number(request.headers.get("Content-Length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 4096) return response(origin, 413, { error: "PAYLOAD_TOO_LARGE" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonymousKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonymousKey || !serviceRoleKey) return response(origin, 503, { error: "FUNCTION_NOT_CONFIGURED" });

  try {
    const bodyText = await request.text();
    if (bodyText.length > 4096) return response(origin, 413, { error: "PAYLOAD_TOO_LARGE" });
    const body = JSON.parse(bodyText) as Record<string, unknown>;
    const workspaceId = String(body.workspaceId ?? "").trim();
    const email = String(body.email ?? "").trim().toLocaleLowerCase("en");
    const role = String(body.role ?? "").trim();
    if (!UUID_PATTERN.test(workspaceId) || !EMAIL_PATTERN.test(email) || email.length > 254 || !ALLOWED_ROLES.has(role)) {
      return response(origin, 400, { error: "INVALID_INPUT" });
    }

    const userClient = createClient(supabaseUrl, anonymousKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const authenticated = await userClient.auth.getUser();
    if (authenticated.error || !authenticated.data.user) return response(origin, 401, { error: "AUTHENTICATION_REQUIRED" });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const membership = await adminClient
      .from("studio_workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", authenticated.data.user.id)
      .maybeSingle();
    if (membership.error || membership.data?.role !== "admin") return response(origin, 403, { error: "ADMIN_ROLE_REQUIRED" });

    let invited = false;
    let targetUser = await findUserByEmail(adminClient, email);
    if (!targetUser) {
      const invitation = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: "https://vision-smart-studio-preview.netlify.app/admin",
      });
      if (invitation.error || !invitation.data.user) throw invitation.error ?? new Error("INVITATION_FAILED");
      targetUser = invitation.data.user;
      invited = true;
    }

    const assignment = await adminClient.from("studio_workspace_members").upsert({
      workspace_id: workspaceId,
      user_id: targetUser.id,
      role,
      created_by: authenticated.data.user.id,
    }, { onConflict: "workspace_id,user_id" });
    if (assignment.error) throw assignment.error;

    return response(origin, 200, { ok: true, invited });
  } catch (error) {
    console.error("admin-invite-member failed", error instanceof Error ? error.message : "UNKNOWN_ERROR");
    return response(origin, 500, { error: "INVITATION_FAILED" });
  }
});
