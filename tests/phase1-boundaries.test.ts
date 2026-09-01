import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_ROOTS = ["app", "components", "lib"] as const;
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);

type RuleId =
  | "network-api"
  | "product-environment"
  | "secret-identifier"
  | "provider-module"
  | "provider-endpoint"
  | "unsafe-html"
  | "ui-runtime-import";

type Finding = {
  rule: RuleId;
  file: string;
  line: number;
  column: number;
  excerpt: string;
  detail: string;
};

type ApprovedException = {
  rule: RuleId;
  file: string;
  exactSource: string;
  reason: string;
};

// Phase 1 currently has no approved boundary exception. Any future exception must
// be restricted to one rule, one repository-relative file and one exact source
// fragment, with an architectural reason. Broad path or regular-expression
// exceptions are deliberately unsupported.
const APPROVED_EXCEPTIONS: readonly ApprovedException[] = [];

const PROVIDER_OR_AI_MODULE_PATTERNS = [
  /^openai(?:\/|$)/i,
  /^@anthropic-ai\//i,
  /^@google\/(?:generative-ai|genai)(?:\/|$)/i,
  /^@ai-sdk\//i,
  /^ai$/i,
  /^openrouter(?:\/|$)/i,
  /^ollama(?:\/|$)/i,
  /^@huggingface\//i,
  /^huggingface(?:\/|$)/i,
  /^mistralai(?:\/|$)/i,
  /^cohere-ai(?:\/|$)/i,
  /^groq-sdk(?:\/|$)/i,
  /^langchain(?:\/|$)/i,
  /^@langchain\//i,
  /^llamaindex(?:\/|$)/i,
  /^@aws-sdk\/client-bedrock-runtime(?:\/|$)/i,
  /^@azure\/openai(?:\/|$)/i,
] as const;

const DIRECT_NETWORK_CLIENT_PACKAGES = new Set([
  "axios",
  "eventsource",
  "got",
  "ky",
  "node-fetch",
  "superagent",
  "ws",
]);

const PROVIDER_ENDPOINT_PATTERN = /(?:api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com|openrouter\.ai\/api|api\.mistral\.ai|api\.cohere\.ai|api\.groq\.com|huggingface\.co)/i;
const SECRET_IDENTIFIER_PATTERN = /^(?:apiKey|accessKey|accessToken|authToken|clientSecret|credential|credentials|password|privateKey|refreshToken|secret|secretKey|token)$/i;
const FUTURE_RUNTIME_IMPORT_PATTERN = /(?:^|\/)(?:adapters?|connectors?|deployments?|execution|infrastructure|model-gateway|providers?|runtimes?|server|workers?)(?:\/|$)/i;
const NODE_RUNTIME_IMPORT_PATTERN = /^(?:node:)?(?:child_process|dgram|fs|net|tls|vm|worker_threads)(?:\/|$)/i;

function normalizePath(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = resolve(directory, entry.name);
      if (entry.isDirectory()) return collectSourceFiles(entryPath);
      if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) return [entryPath];
      return [];
    })
    .sort();
}

function moduleSpecifierFromNode(node: ts.Node): string | null {
  if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
    return node.moduleSpecifier.text;
  }

  if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) {
    if (node.expression.kind === ts.SyntaxKind.ImportKeyword) return node.arguments[0].text;
    if (ts.isIdentifier(node.expression) && node.expression.text === "require") return node.arguments[0].text;
  }

  return null;
}

function isProviderOrAiModule(moduleName: string): boolean {
  return PROVIDER_OR_AI_MODULE_PATTERNS.some((pattern) => pattern.test(moduleName));
}

function isUiSource(file: string): boolean {
  return file.startsWith("components/") || (file.startsWith("app/") && /\.(?:jsx|tsx)$/.test(file));
}

function isProcessEnvironmentAccess(node: ts.Node): boolean {
  if (ts.isPropertyAccessExpression(node)) {
    if (ts.isIdentifier(node.expression) && node.expression.text === "process" && node.name.text === "env") return true;
    if (node.name.text === "env" && ts.isMetaProperty(node.expression) && node.expression.keywordToken === ts.SyntaxKind.ImportKeyword) return true;
  }

  if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "process") {
    return ts.isStringLiteral(node.argumentExpression) && node.argumentExpression.text === "env";
  }

  return false;
}

function scanFile(absolutePath: string): Finding[] {
  const file = normalizePath(relative(PROJECT_ROOT, absolutePath));
  const source = readFileSync(absolutePath, "utf8");
  const scriptKind = absolutePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind);
  const findings: Finding[] = [];

  function report(rule: RuleId, node: ts.Node, detail: string) {
    const start = node.getStart(sourceFile);
    const position = sourceFile.getLineAndCharacterOfPosition(start);
    findings.push({
      rule,
      file,
      line: position.line + 1,
      column: position.character + 1,
      excerpt: node.getText(sourceFile),
      detail,
    });
  }

  function visit(node: ts.Node) {
    const moduleName = moduleSpecifierFromNode(node);
    if (moduleName) {
      if (isProviderOrAiModule(moduleName)) {
        report("provider-module", node, `provider or AI module import: ${moduleName}`);
      }

      if (isUiSource(file) && (FUTURE_RUNTIME_IMPORT_PATTERN.test(moduleName) || NODE_RUNTIME_IMPORT_PATTERN.test(moduleName))) {
        report("ui-runtime-import", node, `UI import crosses a future runtime boundary: ${moduleName}`);
      }
    }

    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === "fetch") {
        report("network-api", node, "direct fetch call");
      }
      if (ts.isPropertyAccessExpression(node.expression) && ["fetch", "sendBeacon"].includes(node.expression.name.text)) {
        report("network-api", node, `network call through ${node.expression.name.text}`);
      }
      if (ts.isIdentifier(node.expression) && ["WebSocket", "XMLHttpRequest", "EventSource"].includes(node.expression.text)) {
        report("network-api", node, `network API call: ${node.expression.text}`);
      }
    }

    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && ["WebSocket", "XMLHttpRequest", "EventSource"].includes(node.expression.text)) {
      report("network-api", node, `network API construction: ${node.expression.text}`);
    }

    if (ts.isPropertyAccessExpression(node) && node.name.text === "fetch") {
      report("network-api", node, "reference to a fetch implementation");
    }

    if (isProcessEnvironmentAccess(node)) {
      report("product-environment", node, "product code reads process.env or import.meta.env");
    }

    if (ts.isIdentifier(node) && (SECRET_IDENTIFIER_PATTERN.test(node.text) || node.text.startsWith("NEXT_PUBLIC_"))) {
      report("secret-identifier", node, `secret-like product identifier: ${node.text}`);
    }

    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && PROVIDER_ENDPOINT_PATTERN.test(node.text)) {
      report("provider-endpoint", node, "hard-coded AI provider endpoint");
    }

    if (ts.isJsxAttribute(node) && node.name.getText(sourceFile) === "dangerouslySetInnerHTML") {
      report("unsafe-html", node, "dangerouslySetInnerHTML is forbidden in Phase 1 UI");
    }

    if ((ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) && node.name.getText(sourceFile) === "dangerouslySetInnerHTML") {
      report("unsafe-html", node, "dangerouslySetInnerHTML is forbidden in Phase 1 product code");
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

function applyExactExceptions(findings: readonly Finding[]) {
  const usedExceptions = new Set<number>();
  const unapproved = findings.filter((finding) => {
    const exceptionIndex = APPROVED_EXCEPTIONS.findIndex((exception) =>
      exception.rule === finding.rule
      && exception.file === finding.file
      && exception.exactSource === finding.excerpt
      && exception.reason.trim().length > 0,
    );
    if (exceptionIndex >= 0) usedExceptions.add(exceptionIndex);
    return exceptionIndex < 0;
  });

  const staleExceptions = APPROVED_EXCEPTIONS.filter((_, index) => !usedExceptions.has(index));
  return { unapproved, staleExceptions };
}

function formatFindings(findings: readonly Finding[]): string {
  return findings
    .map((finding) => `${finding.file}:${finding.line}:${finding.column} [${finding.rule}] ${finding.detail}\n  ${finding.excerpt}`)
    .join("\n");
}

describe("Phase 1 product boundaries", () => {
  it("contains no network, provider, secret, unsafe HTML or UI runtime coupling", () => {
    const files = SCAN_ROOTS.flatMap((root) => collectSourceFiles(resolve(PROJECT_ROOT, root)));
    expect(files.length).toBeGreaterThan(0);

    const { unapproved, staleExceptions } = applyExactExceptions(files.flatMap(scanFile));

    expect(formatFindings(unapproved)).toBe("");
    expect(staleExceptions, "Every exception must match one exact source fragment; stale exceptions are forbidden").toEqual([]);
  });

  it("declares no direct AI/provider SDK or network client dependency", () => {
    const packageJson = JSON.parse(readFileSync(resolve(PROJECT_ROOT, "package.json"), "utf8")) as Record<string, Record<string, string> | undefined>;
    const dependencyGroups = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"] as const;
    const dependencyNames = dependencyGroups.flatMap((group) => Object.keys(packageJson[group] ?? {}));
    const forbidden = dependencyNames
      .filter((name) => isProviderOrAiModule(name) || DIRECT_NETWORK_CLIENT_PACKAGES.has(name))
      .sort();

    expect(forbidden, "Phase 1 package.json must remain provider-neutral and require no direct network client").toEqual([]);
  });
});
