import { decodeStudioState, encodeStudioState } from "@/lib/studio-codec";
import {
  MAX_BLOCKER_FIELD_LENGTH,
  MAX_ENTITY_ID_LENGTH,
  MAX_GATE_EVIDENCE_LENGTH,
  MAX_MISSION_OUTCOME_LENGTH,
  MAX_MISSION_TITLE_LENGTH,
  MAX_PROJECT_DESCRIPTION_LENGTH,
  MAX_PROJECT_NAME_LENGTH,
  MAX_TASK_LABEL_LENGTH,
  MAX_TASK_WEIGHT,
} from "@/lib/studio-service";
import type { StudioStateV3 } from "@/lib/studio-types";
import { describe, expect, it } from "vitest";

const NOW = "2026-09-01T10:00:00.000Z";
const LATER = "2026-09-01T11:00:00.000Z";

function validState(): StudioStateV3 {
  return {
    version: 4,
    revision: 4,
    savedAt: LATER,
    activeProjectId: "project-1",
    projects: [
      {
        id: "project-1",
        name: "Projet",
        description: "Description",
        expectedOutcome: "Résultat attendu du projet",
        status: "active",
        environment: "development",
        repositoryUrl: "https://example.com/acme/studio.git",
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
                  {
                    id: "security",
                    label: "Sécurité",
                    required: true,
                    status: "passed",
                    checkedAt: LATER,
                    evidence: "test:security",
                    reason: null,
                  },
                  {
                    id: "documentation",
                    label: "Documentation",
                    required: true,
                    status: "passed",
                    checkedAt: LATER,
                    evidence: "test:documentation",
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

function legacyStateV3() {
  const current = validState();
  const project = current.projects[0];
  const legacyProject = {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    activeMissionId: project.activeMissionId,
    missions: project.missions,
  };
  return {
    version: 3,
    revision: current.revision,
    savedAt: current.savedAt,
    activeProjectId: current.activeProjectId,
    projects: [legacyProject],
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

describe("studio-codec v4", () => {
  it("décode strictement un snapshot v4 valide", () => {
    const input = validState();
    const result = decodeStudioState(input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migrated).toBe(false);
    expect(result.sourceVersion).toBe(4);
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

  it("exige les gates canoniques qualité, sécurité et documentation", () => {
    const state = validState();
    state.projects[0].missions[0].tasks[0].gates = state.projects[0].missions[0].tasks[0].gates
      .filter((gate) => gate.label === "Qualité");

    const result = decodeStudioState(state);
    expect(result.ok).toBe(false);
    if (result.ok || result.kind === "unsupported_version") return;
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "missing_mandatory_gate", message: expect.stringContaining("Sécurité") }),
      expect.objectContaining({ code: "missing_mandatory_gate", message: expect.stringContaining("Documentation") }),
    ]));
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

  it("valide les paramètres projet v4 et refuse les références de dépôt à credentials", () => {
    const invalidStatus = validState();
    Object.assign(invalidStatus.projects[0], { status: "archived" });
    expect(decodeStudioState(invalidStatus).ok).toBe(false);

    const invalidEnvironment = validState();
    Object.assign(invalidEnvironment.projects[0], { environment: "local" });
    expect(decodeStudioState(invalidEnvironment).ok).toBe(false);

    const credentialUrl = validState();
    credentialUrl.projects[0].repositoryUrl = "https://user:secret@example.com/repo.git";
    const result = decodeStudioState(credentialUrl);
    expect(result.ok).toBe(false);
    if (!result.ok && result.kind !== "unsupported_version") {
      expect(result.issues.some((item) => item.code === "invalid_repository_url")).toBe(true);
    }
  });

  it("borne strictement tous les contenus utilisateur persistés", () => {
    const cases: Array<(state: StudioStateV3) => void> = [
      (state) => { state.projects[0].id = "p".repeat(MAX_ENTITY_ID_LENGTH + 1); },
      (state) => { state.projects[0].name = "p".repeat(MAX_PROJECT_NAME_LENGTH + 1); },
      (state) => { state.projects[0].description = "d".repeat(MAX_PROJECT_DESCRIPTION_LENGTH + 1); },
      (state) => {
        state.projects[0].missions[0].title = "m".repeat(MAX_MISSION_TITLE_LENGTH + 1);
      },
      (state) => {
        state.projects[0].missions[0].expectedOutcome = "r".repeat(MAX_MISSION_OUTCOME_LENGTH + 1);
      },
      (state) => {
        state.projects[0].missions[0].tasks[0].label = "a".repeat(MAX_TASK_LABEL_LENGTH + 1);
      },
      (state) => {
        state.projects[0].missions[0].tasks[0].weight = MAX_TASK_WEIGHT + 1;
      },
      (state) => {
        state.projects[0].missions[0].tasks[0].gates[0].evidence =
          "e".repeat(MAX_GATE_EVIDENCE_LENGTH + 1);
      },
    ];

    for (const mutate of cases) {
      const state = validState();
      mutate(state);
      expect(decodeStudioState(state).ok).toBe(false);
    }

    const blocker = validState();
    const task = blocker.projects[0].missions[0].tasks[0];
    task.status = "blocked";
    task.progress = 99;
    task.blocker = {
      reason: "b".repeat(MAX_BLOCKER_FIELD_LENGTH + 1),
      requiredAction: "Corriger",
      resumeCondition: "Correction validée",
      blockedAt: LATER,
    };
    expect(decodeStudioState(blocker).ok).toBe(false);

    const controlCharacter = validState();
    controlCharacter.projects[0].description = "Description\ninjectée";
    const result = decodeStudioState(controlCharacter);
    expect(result.ok).toBe(false);
    if (!result.ok && result.kind !== "unsupported_version") {
      expect(result.issues.some((item) => item.code === "control_character")).toBe(true);
    }
  });

  it("refuse un projet completed dont la progression n'est pas validée", () => {
    const state = validState();
    const task = state.projects[0].missions[0].tasks[0];
    task.status = "todo";
    task.progress = 99;
    state.projects[0].status = "completed";
    expect(decodeStudioState(state).ok).toBe(false);
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
    expect(result.state).toMatchObject({ version: 4, revision: 0, savedAt: LATER });
    const project = result.state.projects[0];
    expect(project).toMatchObject({
      expectedOutcome: "À définir",
      status: "draft",
      environment: "development",
      repositoryUrl: null,
    });
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

  it("migre v3 vers v4 sans toucher aux missions, tâches, preuves ni révision", () => {
    const legacy = legacyStateV3();
    const blockedTask = structuredClone(legacy.projects[0].missions[0].tasks[0]);
    Object.assign(blockedTask, {
      id: "task-blocked",
      status: "blocked",
      progress: 99,
      blocker: {
        reason: "Dépendance externe",
        requiredAction: "Obtenir l’accord",
        resumeCondition: "Accord archivé",
        blockedAt: LATER,
      },
      legacy: { reportedStatus: "blocked", reportedProgress: 50 },
    });
    legacy.projects[0].missions[0].tasks.push(blockedTask);
    const result = decodeStudioState(legacy);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result).toMatchObject({ migrated: true, sourceVersion: 3 });
    expect(result.state).toMatchObject({ version: 4, revision: legacy.revision, savedAt: legacy.savedAt });
    expect(result.state.projects[0]).toMatchObject({
      expectedOutcome: "À définir",
      status: "draft",
      environment: "development",
      repositoryUrl: null,
    });
    expect(result.state.projects[0].missions).toEqual(legacy.projects[0].missions);
    expect(result.warnings.some((warning) => warning.code === "project_metadata_defaulted")).toBe(true);
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

  it("produit une migration idempotente une fois le v4 obtenu", () => {
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
