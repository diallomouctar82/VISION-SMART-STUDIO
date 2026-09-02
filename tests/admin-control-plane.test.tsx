import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminResourceCard } from "@/components/admin/AdminResourceCard";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = [
  "20260901235936_admin_control_plane.sql",
  "20260902000420_harden_admin_control_plane.sql",
  "20260902000610_secure_workspace_bootstrap.sql",
  "20260902023000_enforce_admin_action_integrity.sql",
].map((file) => readFileSync(resolve(PROJECT_ROOT, "supabase/migrations", file), "utf8")).join("\n");
const INVITE_FUNCTION = readFileSync(resolve(PROJECT_ROOT, "supabase/functions/admin-invite-member/index.ts"), "utf8");

const EXPECTED_TABLES = [
  "studio_workspaces",
  "studio_workspace_members",
  "studio_platform_settings",
  "studio_secret_references",
  "studio_connector_bindings",
  "studio_hosting_targets",
  "studio_workers",
  "studio_ai_providers",
  "studio_ai_models",
  "studio_model_deployments",
  "studio_routing_policies",
  "studio_action_requests",
  "studio_connection_checks",
  "studio_audit_events",
] as const;

describe("administrative data plane", () => {
  it("creates and forces RLS on every control-plane table", () => {
    for (const table of EXPECTED_TABLES) {
      expect(MIGRATIONS).toMatch(new RegExp(`create table public\\.${table}\\b`, "iu"));
      expect(MIGRATIONS).toMatch(new RegExp(`alter table public\\.${table} force row level security`, "iu"));
    }
  });

  it("denies anonymous access and limits browser-observed fields", () => {
    expect(MIGRATIONS).toMatch(/revoke all on all tables in schema public from anon/iu);
    expect(MIGRATIONS).not.toMatch(/grant update \([^)]*health_status[^)]*\)/iu);
    expect(MIGRATIONS).not.toMatch(/grant (?:select, )?insert on public\.studio_connection_checks/iu);
    expect(MIGRATIONS).not.toMatch(/grant (?:update|delete)(?:, (?:update|delete))* on public\.studio_audit_events/iu);
    expect(MIGRATIONS).toMatch(/grant select on public\.studio_connection_checks to authenticated/iu);
    expect(MIGRATIONS).toMatch(/grant select on public\.studio_audit_events to authenticated/iu);
  });

  it("stores vault references without defining raw secret columns", () => {
    const secretTable = MIGRATIONS.match(/create table public\.studio_secret_references[\s\S]*?\n\);/iu)?.[0] ?? "";
    expect(secretTable).toContain("external_reference");
    expect(secretTable).not.toMatch(/secret_value|plaintext|private_key|access_token/iu);
  });

  it("keeps workspace bootstrap under invoker permissions", () => {
    const initialFunction = MIGRATIONS.indexOf("create or replace function public.studio_create_workspace");
    const invokerAlter = MIGRATIONS.lastIndexOf("alter function public.studio_create_workspace(text, text) security invoker");
    expect(initialFunction).toBeGreaterThan(-1);
    expect(invokerAlter).toBeGreaterThan(initialFunction);
    expect(MIGRATIONS.slice(invokerAlter)).not.toMatch(/alter function public\.studio_create_workspace\(text, text\) security definer/iu);
  });

  it("validates polymorphic action targets and makes transitions atomic", () => {
    expect(MIGRATIONS).toMatch(/create trigger studio_validate_action_request/iu);
    expect(MIGRATIONS).toMatch(/ACTION_TARGET_INVALID/iu);
    expect(MIGRATIONS).toMatch(/ACTION_NOT_ALLOWED_FOR_TARGET/iu);
    expect(MIGRATIONS).toMatch(/create or replace function public\.studio_request_transition/iu);
    expect(MIGRATIONS).toMatch(/studio_request_transition[\s\S]*security invoker/iu);
    expect(MIGRATIONS).toMatch(/RESOURCE_VERSION_CONFLICT/iu);
  });

  it("prevents cross-workspace and external confidential routing", () => {
    expect(MIGRATIONS).toMatch(/create trigger studio_validate_routing_policy/iu);
    expect(MIGRATIONS).toMatch(/ROUTING_MODEL_INVALID/iu);
    expect(MIGRATIONS).toMatch(/ROUTING_INTERNAL_MODEL_REQUIRED/iu);
  });
});

describe("administrative resource presentation", () => {
  it("distinguishes requested, observed and health states", () => {
    render(<AdminResourceCard desiredState="active" healthStatus="unknown" kind="vps_gpu" observedState="unverified" title="GPU Europe" />);
    expect(screen.getByRole("heading", { name: "GPU Europe" })).toBeInTheDocument();
    expect(screen.getByText("État demandé")).toBeInTheDocument();
    expect(screen.getByText("État observé")).toBeInTheDocument();
    expect(screen.getByText("unknown")).toHaveClass("admin-status--warning");
  });
});

describe("member invitation edge function", () => {
  it("pins its SDK and requires an authenticated administrator", () => {
    expect(INVITE_FUNCTION).toContain("npm:@supabase/supabase-js@2.112.4");
    expect(INVITE_FUNCTION).toMatch(/getUser\(\)/u);
    expect(INVITE_FUNCTION).toMatch(/membership\.data\?\.role !== "admin"/u);
    expect(INVITE_FUNCTION.indexOf("ADMIN_ROLE_REQUIRED")).toBeLessThan(INVITE_FUNCTION.indexOf("inviteUserByEmail"));
  });

  it("uses an exact CORS allowlist and never returns credential material", () => {
    expect(INVITE_FUNCTION).toContain('"https://vision-smart-studio-preview.netlify.app"');
    expect(INVITE_FUNCTION).not.toMatch(/Access-Control-Allow-Origin[^\n]*\*/u);
    expect(INVITE_FUNCTION).not.toMatch(/JSON\.stringify\([^)]*(?:serviceRoleKey|authorization)/u);
  });
});
