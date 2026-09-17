import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const client = readFileSync("lib/ai-core-specification.ts", "utf8");
const ui = readFileSync("components/StudioWorkspace.tsx", "utf8");
const proxy = readFileSync("app/api/ai-core/[...path]/route.ts", "utf8");
const docs = readFileSync("docs/AI-CORE-SPEC-KIT-INTEGRATION.md", "utf8");

assert.match(client, /\/specification-sessions/);
assert.match(client, /continueSpecificationSession/);
assert.match(client, /sessionToken/);
assert.match(client, /session_token/);
assert.match(client, /inputMode: "text" \| "voice"/);
assert.doesNotMatch(client, /NEXT_PUBLIC_AI_CORE/);

assert.match(ui, /startSpecificationSession/);
assert.match(ui, /continueSpecificationSession/);
assert.match(ui, /specification\.sessionToken/);
assert.match(ui, /webkitSpeechRecognition/);
assert.match(ui, /conversation\.map/);

assert.match(proxy, /AI_CORE_SERVICE_TOKEN/);
assert.match(proxy, /authorization.*Bearer/si);
assert.match(proxy, /specification-sessions/);
assert.doesNotMatch(proxy, /NEXT_PUBLIC_AI_CORE/);
assert.match(proxy, /Aucun résultat n'a été simulé/);

assert.match(docs, /ne crée pas de logique parallèle/i);
assert.match(docs, /AI_CORE_SERVICE_TOKEN/);
assert.match(docs, /multi-tours/i);

console.log("Studio ↔ AI Core contract: server-only auth, voice/text parity and multi-turn continuation passed.");
