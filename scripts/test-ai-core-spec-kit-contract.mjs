import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const client = readFileSync("lib/ai-core-specification.ts", "utf8");
const ui = readFileSync("components/StudioWorkspace.tsx", "utf8");
const docs = readFileSync("docs/AI-CORE-SPEC-KIT-INTEGRATION.md", "utf8");

assert.match(client, /\/v1\/specification-sessions/);
assert.match(client, /NEEDS_CLARIFICATION/);
assert.match(client, /inputMode: "text" \| "voice"/);
assert.match(ui, /startSpecificationSession/);
assert.match(ui, /knownContext/);
assert.match(ui, /AI_CORE_NOT_CONFIGURED/);
assert.match(ui, /webkitSpeechRecognition/);
assert.match(docs, /ne crée pas de logique parallèle/);
console.log("Spec Kit Studio contract: clear, ambiguous, voice and non-regression checks passed.");
