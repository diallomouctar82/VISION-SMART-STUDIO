import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const workspace = read("components/StudioWorkspace.tsx");
const store = read("lib/studio-store.ts");
const roadmap = read("docs/ROADMAP.md");

const checks = [
  [workspace.includes("Missions inachevées"), "cockpit exposes incomplete missions"],
  [workspace.includes("Missions prévues"), "cockpit exposes planned missions"],
  [workspace.includes("Missions terminées"), "cockpit exposes completed missions"],
  [workspace.includes("Mission active"), "cockpit exposes active mission"],
  [workspace.includes("Preview"), "cockpit exposes preview surface"],
  [workspace.includes("Feuille de route"), "cockpit exposes roadmap surface"],
  [workspace.includes("startVoiceInput"), "browser voice input remains wired"],
  [workspace.includes("Vision — prévue Phase 5"), "vision is visibly roadmap-scoped"],
  [workspace.includes("Fichiers — prévus Phase 5"), "files are visibly roadmap-scoped"],
  [workspace.includes("startSpecificationSession") && workspace.includes("continueSpecificationSession"), "AI Core multi-turn transport remains wired"],
  [!workspace.includes("Avancer +25%"), "fake manual progress action is absent"],
  [workspace.includes("Aucun avancement manuel fictif"), "progress semantics are explicit"],
  [store.includes("missionLifecycle") && store.includes("groupMissions"), "mission lanes derive from mission/task state"],
  [roadmap.includes("Phase 5 — Voice & Multimodal Interaction"), "canonical roadmap still defines multimodal phase"],
  [roadmap.includes("Phase 10 — Validation & Controlled Production Delivery"), "canonical roadmap still defines controlled delivery"],
];

const failed = checks.filter(([ok]) => !ok);
for (const [ok, label] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
}
if (failed.length) {
  console.error(`Mission cockpit contract failed: ${failed.length} check(s).`);
  process.exit(1);
}
console.log(`Mission cockpit contract PASS (${checks.length}/${checks.length}).`);
