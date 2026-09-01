import { decodeStudioState, encodeStudioState } from "@/lib/studio-codec";
import type { StudioStateV3 } from "@/lib/studio-types";
import { describe, expect, it } from "vitest";

const NOW = "2026-09-01T10:00:00.000Z";
const LATER = "2026-09-01T11:00:00.000Z";

function validState(): StudioStateV3 {
  return {
    version: 3,
    revision: 4,
    savedAt: LATER,
    activeProjectId: "project-1",
    projects: [
      {
        id: "project-1",
        name: "Projet",
        description: "Description",
        createdAt: NOW,
        updatedAt: LATER,
        activeMissionId: "mission-1",
        missions: [
          {
            id: "mission-1",
            title: "Mission",
            expectedOutcome: "Résultat vérifié",
            tasks: [
              {
                id: "task-1",
                label: "Tâche",
                status: "done",
                weight: 2,
                progress: 100,
                checkpoints: [
                  { id: "cp-1", label: "Fonctionnel", weight: 1, verified: true, verifiedAt: LATER },
                ],
                gates: [
                  {
                    id: "quality",
                    label: "Qualité",
                    required: true,
                    status: "passed",
                    checkedAt: LATER,
                    evidence: "test:studio",
                    reason: null,
                  },
                ],
                blocker: null,
                legacy: null,
              },
            ],
          },
        ],
      },
    ],
  };
}

function legacyTask(status = "done", progress = 100) {
  return { id: "legacy-task", label: "Ancienne tâche", status, progress };
}

function legacyProjectV1(tasks = [legacyTask()]) {
  return {
    id: "legacy-project",
    name: "Projet historique",
    description: "Description historique",
    createdAt: NOW,
    updatedAt: LATER,
    tasks,
  };
}

describe("studio-codec v3", () => {
  it("décode strictement un snapshot v3 valide", () => {
    const input = validState();
    const result = decodeStudioState(input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migrated).toBe(false);
    expect(result.sourceVersion).toBe(3);
    expect(result.state).toEqual(input);
    expect(result.state).not.toBe(input);
  });

  it("encode puis redécode sans perte", () => {
    const state = validState();
    const encoded = encodeStudioState(state);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;

    const decoded = decodeStudioState(encoded.json);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.state).toEqual(state);
  });

  it("rejette le JSON syntaxiquement invalide", () => {
    expect(decodeStudioState("{non-json")).toMatchObject({ ok: false, kind: "invalid_json" });
  });

  it("refuse une version future sans la rétrograder", () => {
    const result = decodeStudioState({ ...validState(), version: 9 });
    expect(result).toMatchObject({ ok: false, kind: "unsupported_version", version: 9 });
  });

  it("rejette les champs inconnus à tous les niveaux", () => {
    const state = validState() as StudioStateV3 & { token?: string };
    state.token = "interdit";
    const result = decodeStudioState(state);
    expect(result.ok).toBe(false);
    if (result.ok || result.kind === "unsupported_version") return;
    expect(result.issues).toContainEqual(expect.objectContaining({ path: "$.token", code: "unknown_field" }));
  });

  it("rejette une progression mise en cache qui diverge du calcul", () => {
    const state = validState();
    state.projects[0].missions[0].tasks[0].progress = 42;
    const result = decodeStudioState(state);
    expect(result.ok).toBe(false);
    if (result.ok || result.kind === "unsupported_version") return;
    expect(result.issues.some((item) => item.code === "stale_derived_progress")).toBe(true);
  });

  it("rejette done sans gates requises satisfaites", () => {
    const state = validState();
    const task = state.projects[0].missions[0].tasks[0];
    task.gates[0] = {
      ...task.gates[0],
      status: "pending",
      checkedAt: null,
      evidence: null,
      reason: null,
    };
    task.progress = 90;
    const result = decodeStudioState(state);
    expect(result.ok).toBe(false);
    if (result.ok || result.kind === "unsupported_version") return;
    expect(result.issues.some((item) => item.code === "invalid_done_task")).toBe(true);
  });

  it("accepte un gate requis non applicable avec raison et horodatage", () => {
    const state = validState();
    const gate = state.projects[0].missions[0].tasks[0].gates[0];
    Object.assign(gate, {
      status: "not_applicable",
      checkedAt: LATER,
      evidence: null,
      reason: "Aucun impact sécurité dans ce lot.",
    });
    expect(decodeStudioState(state).ok).toBe(true);
  });

  it("rejette passed sans preuve et not_applicable sans raison", () => {
    const withoutEvidence = validState();
    withoutEvidence.projects[0].missions[0].tasks[0].gates[0].evidence = null;
    expect(decodeStudioState(withoutEvidence).ok).toBe(false);

    const withoutReason = validState();
    const gate = withoutReason.projects[0].missions[0].tasks[0].gates[0];
    Object.assign(gate, { status: "not_applicable", evidence: null, reason: null });
    expect(decodeStudioState(withoutReason).ok).toBe(false);
  });

  it("exige un blocker traçable exactement quand le statut est blocked", () => {
    const missing = validState();
    const task = missing.projects[0].missions[0].tasks[0];
    task.status = "blocked";
    task.progress = 99;
    const result = decodeStudioState(missing);
    expect(result.ok).toBe(false);
    if (!result.ok && result.kind !== "unsupported_version") {
      expect(result.issues.some((item) => item.code === "missing_blocker")).toBe(true);
    }

    const unexpected = validState();
    unexpected.projects[0].missions[0].tasks[0].blocker = {
      reason: "Dépendance",
      requiredAction: "Résoudre",
      resumeCondition: "Dépendance disponible",
      blockedAt: LATER,
    };
    unexpected.projects[0].missions[0].tasks[0].progress = 99;
    expect(decodeStudioState(unexpected).ok).toBe(false);
  });

  it("rejette les références actives pendantes et les identifiants dupliqués", () => {
    const dangling = validState();
    dangling.projects[0].activeMissionId = "absente";
    expect(decodeStudioState(dangling).ok).toBe(false);

    const duplicate = validState();
    duplicate.projects.push(structuredClone(duplicate.projects[0]));
    expect(decodeStudioState(duplicate).ok).toBe(false);
  });

  it("rejette une date invalide ou inversée", () => {
    const invalid = validState();
    invalid.projects[0].updatedAt = "2025-01-01T00:00:00.000Z";
    expect(decodeStudioState(invalid).ok).toBe(false);
  });
});

describe("migrations legacy", () => {
  it("migre v1 sans inventer validation ni progression vérifiée", () => {
    const legacy = {
      activeProjectId: "legacy-project",
      projects: [legacyProjectV1()],
    };
    const result = decodeStudioState(legacy, { now: () => LATER });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result).toMatchObject({ migrated: true, sourceVersion: 1 });
    expect(result.state).toMatchObject({ version: 3, revision: 0, savedAt: LATER });
    const project = result.state.projects[0];
    expect(project.activeMissionId).toBe("legacy-project-mission-1");
    const task = project.missions[0].tasks[0];
    expect(task).toMatchObject({
      status: "in_progress",
      progress: 0,
      legacy: { reportedStatus: "done", reportedProgress: 100 },
      blocker: null,
    });
    expect(task.checkpoints.every((checkpoint) => !checkpoint.verified)).toBe(true);
    expect(task.gates.every((gate) => gate.status === "pending")).toBe(true);
    expect(result.warnings.some((warning) => warning.code === "legacy_task_requires_verification")).toBe(true);
  });

  it("préserve explicitement une liste vide au lieu d'injecter des tâches", () => {
    const result = decodeStudioState(
      { activeProjectId: "legacy-project", projects: [legacyProjectV1([])] },
      { now: () => LATER },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.projects[0].missions[0].tasks).toEqual([]);
  });

  it("répare explicitement une référence projet legacy invalide", () => {
    const result = decodeStudioState(
      { activeProjectId: "inexistant", projects: [legacyProjectV1([])] },
      { now: () => LATER },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.activeProjectId).toBe("legacy-project");
    expect(result.warnings.some((warning) => warning.code === "active_project_repaired")).toBe(true);
  });

  it("migre v2 en conservant toutes les missions et sélectionne la première", () => {
    const legacy = {
      version: 2,
      activeProjectId: "legacy-project",
      projects: [
        {
          id: "legacy-project",
          name: "Projet historique",
          description: "Description historique",
          createdAt: NOW,
          updatedAt: LATER,
          missions: [
            { id: "mission-a", title: "A", expectedOutcome: "Résultat A", tasks: [legacyTask()] },
            { id: "mission-b", title: "B", expectedOutcome: "Résultat B", tasks: [] },
          ],
        },
      ],
    };
    const result = decodeStudioState(legacy, { now: () => LATER });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sourceVersion).toBe(2);
    expect(result.state.projects[0].missions.map((mission) => mission.id)).toEqual(["mission-a", "mission-b"]);
    expect(result.state.projects[0].activeMissionId).toBe("mission-a");
  });

  it("conserve un ancien blocage comme provenance sans inventer sa raison", () => {
    const legacy = {
      version: 2,
      activeProjectId: "legacy-project",
      projects: [
        {
          id: "legacy-project",
          name: "Projet historique",
          description: "Description historique",
          createdAt: NOW,
          updatedAt: LATER,
          missions: [
            { id: "mission", title: "Mission", expectedOutcome: "Résultat", tasks: [legacyTask("blocked", 50)] },
          ],
        },
      ],
    };
    const result = decodeStudioState(legacy, { now: () => LATER });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const task = result.state.projects[0].missions[0].tasks[0];
    expect(task.status).toBe("in_progress");
    expect(task.blocker).toBeNull();
    expect(task.legacy).toEqual({ reportedStatus: "blocked", reportedProgress: 50 });
    expect(result.warnings.some((warning) => warning.code === "legacy_blocker_requires_details")).toBe(true);
  });

  it("produit une migration idempotente une fois le v3 obtenu", () => {
    const first = decodeStudioState(
      { activeProjectId: "legacy-project", projects: [legacyProjectV1()] },
      { now: () => LATER },
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = decodeStudioState(first.state, { now: () => "2030-01-01T00:00:00.000Z" });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.migrated).toBe(false);
    expect(second.state).toEqual(first.state);
  });

  it("rejette une donnée legacy ambiguë au lieu de la corriger silencieusement", () => {
    const invalid = {
      activeProjectId: "legacy-project",
      projects: [legacyProjectV1([{ ...legacyTask(), progress: 125 }])],
    };
    expect(decodeStudioState(invalid).ok).toBe(false);
  });
});
