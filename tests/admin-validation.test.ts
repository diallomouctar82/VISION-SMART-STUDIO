import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createIdempotencyKey,
  normalizeAdminText,
  optionalPositiveInteger,
  parseAdminList,
  requireAdminLabel,
  requireHttpsUrl,
  requireSecretReference,
} from "@/lib/admin-validation";
import { readPublicSupabaseConfiguration } from "@/lib/supabase-client";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

afterEach(() => {
  vi.unstubAllEnvs();
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
});

describe("administrative input validation", () => {
  it("normalizes labels and rejects invalid lengths", () => {
    expect(normalizeAdminText("  Worker\t GPU  ")).toBe("Worker GPU");
    expect(requireAdminLabel("  Worker GPU  ", "Nom")).toBe("Worker GPU");
    expect(() => requireAdminLabel("x", "Nom")).toThrow(/entre 2/u);
  });

  it("deduplicates lists without losing display spelling", () => {
    expect(parseAdminList("compute.execute, Model.Inference\ncompute.execute", "Capacités"))
      .toEqual(["compute.execute", "Model.Inference"]);
  });

  it("only accepts credential-free HTTPS endpoints", () => {
    expect(requireHttpsUrl("https://worker.example.com/api", "Endpoint")).toBe("https://worker.example.com/api");
    expect(() => requireHttpsUrl("http://worker.example.com", "Endpoint")).toThrow(/HTTPS/u);
    expect(() => requireHttpsUrl("https://user:pass@worker.example.com", "Endpoint")).toThrow(/sans identifiants/u);
    expect(() => requireHttpsUrl("https://worker.example.com?token=value", "Endpoint")).toThrow(/paramètres/u);
  });

  it("accepts vault references, never free-form secret material", () => {
    expect(requireSecretReference("vault/prod/github-token")).toBe("vault/prod/github-token");
    expect(() => requireSecretReference("contains spaces and unsafe material")).toThrow(/référence externe/u);
  });

  it("validates non-negative integer capacities", () => {
    expect(optionalPositiveInteger("0", "GPU")).toBe(0);
    expect(optionalPositiveInteger("", "GPU")).toBeNull();
    expect(() => optionalPositiveInteger("1.5", "GPU")).toThrow(/entier/u);
  });

  it("derives stable, version-bound idempotency keys", () => {
    const targetId = "00000000-0000-4000-8000-000000000001";
    const first = createIdempotencyKey("worker", targetId, "maintenance", "staging", 7, "maintenance");
    const replay = createIdempotencyKey("worker", targetId, "maintenance", "staging", 7, "maintenance");
    const nextVersion = createIdempotencyKey("worker", targetId, "maintenance", "staging", 8, "maintenance");
    expect(first).toBe(`v1:t:maintenance:worker:${targetId}:maintenance:staging:7`);
    expect(replay).toBe(first);
    expect(nextVersion).not.toBe(first);
    expect(() => createIdempotencyKey("worker", targetId, "maintenance", "staging", 0, "maintenance"))
      .toThrow(/version/u);
  });
});

describe("public Supabase configuration", () => {
  it("accepts only a Supabase HTTPS URL and a publishable key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co/");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test-value");
    expect(readPublicSupabaseConfiguration()).toEqual({
      url: "https://project.supabase.co",
      publishableKey: "sb_publishable_test-value",
    });
  });

  it("rejects absent, foreign or service-style configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.com");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "service_role_value");
    expect(readPublicSupabaseConfiguration()).toBeNull();
  });
});
