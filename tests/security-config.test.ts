import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

type Header = { key: string; value: string };
type HeaderRule = { source: string; headers: Header[] };
type ConfigUnderTest = {
  poweredByHeader?: boolean;
  headers?: () => Promise<HeaderRule[]>;
};

let config: ConfigUnderTest;
let globalHeaders: Map<string, string>;

function headerMap(headers: readonly Header[]): Map<string, string> {
  const normalized = headers.map(({ key, value }) => [key.toLowerCase(), value] as const);
  expect(new Set(normalized.map(([key]) => key)).size, "Security headers must not be declared more than once").toBe(normalized.length);
  return new Map(normalized);
}

function parseCsp(value: string): Map<string, string[]> {
  const directives = value
    .split(";")
    .map((directive) => directive.trim())
    .filter(Boolean)
    .map((directive) => {
      const [name, ...sources] = directive.split(/\s+/);
      return [name.toLowerCase(), sources] as const;
    });

  expect(new Set(directives.map(([name]) => name)).size, "CSP directives must be unique").toBe(directives.length);
  return new Map(directives);
}

beforeAll(async () => {
  const mutableEnvironment = process.env as Record<string, string | undefined>;
  const previousNodeEnvironment = mutableEnvironment.NODE_ENV;
  mutableEnvironment.NODE_ENV = "production";

  try {
    const moduleUrl = pathToFileURL(resolve(PROJECT_ROOT, "next.config.mjs"));
    moduleUrl.searchParams.set("phase1-security-test", `${Date.now()}`);
    const imported = await import(moduleUrl.href) as { default: ConfigUnderTest };
    config = imported.default;
  } finally {
    if (previousNodeEnvironment === undefined) delete mutableEnvironment.NODE_ENV;
    else mutableEnvironment.NODE_ENV = previousNodeEnvironment;
  }

  expect(config.headers, "next.config.mjs must expose a headers() policy").toBeTypeOf("function");
  const rules = await config.headers!();
  const matchingRules = rules.filter((rule) => rule.source === "/(.*)" || rule.source === "/:path*");
  expect(matchingRules, "Security headers must cover every application path").toHaveLength(1);
  globalHeaders = headerMap(matchingRules[0].headers);
});

describe("Next.js security configuration", () => {
  it("disables the framework disclosure header", () => {
    expect(config.poweredByHeader).toBe(false);
  });

  it("enforces a restrictive Content Security Policy without external wildcard sources", () => {
    expect(globalHeaders.has("content-security-policy-report-only"), "CSP must be enforced, not report-only").toBe(false);
    const cspValue = globalHeaders.get("content-security-policy");
    expect(cspValue).toBeTruthy();

    const directives = parseCsp(cspValue!);
    expect(directives.get("default-src")).toEqual(["'self'"]);
    expect(directives.get("connect-src")).toEqual(["'self'"]);
    expect(directives.get("object-src")).toEqual(["'none'"]);
    expect(directives.get("base-uri")).toEqual(["'self'"]);
    expect(directives.get("form-action")).toEqual(["'self'"]);
    expect(directives.get("frame-ancestors")).toEqual(["'none'"]);
    expect(directives.get("frame-src")).toEqual(["'none'"]);
    expect(directives.get("media-src")).toEqual(["'none'"]);
    expect(directives.get("script-src")).toContain("'self'");
    expect(directives.get("script-src")).not.toContain("'unsafe-eval'");
    expect(directives.get("style-src")).toContain("'self'");
    expect(directives.get("font-src")).toEqual(["'self'"]);

    const externalSources: string[] = [];
    for (const [directive, sources] of directives) {
      for (const source of sources) {
        const wildcard = source.includes("*");
        const networkScheme = /^(?:https?|wss?):/i.test(source);
        const protocolRelative = source.startsWith("//");
        const hostname = /^(?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?(?:\/|$)/i.test(source);
        const nonImageDataSource = (source === "data:" || source === "blob:") && directive !== "img-src";
        if (wildcard || networkScheme || protocolRelative || hostname || nonImageDataSource) {
          externalSources.push(`${directive} ${source}`);
        }
      }
    }

    expect(externalSources, "CSP must not allow wildcard or external network sources").toEqual([]);
  });

  it("enforces MIME sniffing, framing and referrer protections", () => {
    expect(globalHeaders.get("x-content-type-options")?.toLowerCase()).toBe("nosniff");
    expect(globalHeaders.get("x-frame-options")?.toUpperCase()).toBe("DENY");
    expect(globalHeaders.get("referrer-policy")?.toLowerCase()).toBe("strict-origin-when-cross-origin");
  });

  it("denies camera, microphone and geolocation permissions", () => {
    const permissions = globalHeaders.get("permissions-policy")
      ?.split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);

    expect(permissions).toEqual(expect.arrayContaining(["camera=()", "microphone=()", "geolocation=()"]));
    expect(permissions?.some((entry) => entry.includes("*"))).toBe(false);
  });
});
