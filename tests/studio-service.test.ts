import { describe, expect, it } from "vitest";
import {
  blockTask,
  createInitialStudioState,
  createMission,
  createProject,
  createTask,
  MAX_MISSION_OUTCOME_LENGTH,
  MAX_MISSION_TITLE_LENGTH,
  MAX_PROJECT_DESCRIPTION_LENGTH,
  MAX_PROJECT_NAME_LENGTH,
  MAX_PROJECT_OUTCOME_LENGTH,
  MAX_REPOSITORY_URL_LENGTH,
  MAX_TASK_LABEL_LENGTH,
  recordGateResult,
  requestTaskCompletion,
  selectMission,
  selectProject,
  toggleCheckpoint,
  unblockTask,
  updateProject,
  type StudioIdKind,
  type StudioServiceDependencies,
  type StudioServiceResult,
  type TaskTarget,
} from "../lib/studio-service";
import { missionProgress, projectProgress, taskProgress } from "../lib/studio-progress";
import type { StudioStateV3, StudioTaskV3 } from "../lib/studio-types";

function dependencies(options: { firstIds?: string[]; constantId?: string } = {}): StudioServiceDependencies {
  const firstIds = [...(options.firstIds ?? [])];
  let sequence = 0;
  let clockTick = 0;

  return {
    now: () => {
      const timestamp = new Date(Date.UTC(2026, 8, 1, 12, 0, clockTick)).toISOString();
      clockTick += 1;
      return timestamp;
    },
    createId: (kind: StudioIdKind) => {
      const queued = firstIds.shift();
      if (queued !== undefined) return queued;
      if (options.constantId !== undefined) return options.constantId;
      sequence += 1;
      return `opaque-${kind}-${String(sequence).padStart(4, "0")}`;
    },
  };
}

function unwrap<T>(result: StudioServiceResult<T>): T {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.value;
}

function initialState(customDependencies = dependencies()): StudioStateV3 {
  return unwrap(createInitialStudioState(customDependencies));
}

function firstTarget(state: StudioStateV3, projectIndex = 0, taskIndex = 0): TaskTarget {
  const project = state.projects[projectIndex];
  const mission = project.missions[0];
  return { projectId: project.id, missionId: mission.id, taskId: mission.tasks[taskIndex].id };
}

function taskAt(state: StudioStateV3, target: TaskTarget): StudioTaskV3 {
  return state.projects
    .find((project) => project.id === target.projectId)!
    .missions.find((mission) => mission.id === target.missionId)!
    .tasks.find((task) => task.id === target.taskId)!;
}

function verifyAllCheckpoints(
  state: StudioStateV3,
  target: TaskTarget,
  serviceDependencies: StudioServiceDependencies,
): StudioStateV3 {
  return taskAt(state, target).checkpoints.reduce(
    (current, checkpoint) => unwrap(toggleCheckpoint(
      current,
      { ...target, checkpointId: checkpoint.id, verified: true },
      serviceDependencies,
    )),
    state,
  );
}

function passAllGates(
  state: StudioStateV3,
  target: TaskTarget,
  serviceDependencies: StudioServiceDependencies,
): StudioStateV3 {
  return taskAt(state, target).gates.reduce(
    (current, gate) => unwrap(recordGateResult(
      current,
      { ...target, gateId: gate.id, status: "passed", evidence: `preuve:${gate.id}` },
      serviceDependencies,
    )),
    state,
  );
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
}

describe("Phase 1 studio application service", () => {
  it("creates an honest initial state with no fabricated progress or validation", () => {
    const state = initialState();
    const project = state.projects[0];

    expect(state.version).toBe(4);
    expect(state.revision).toBe(0);
    expect(state.activeProjectId).toBe(project.id);
    expect(project.activeMissionId).toBe(project.missions[0].id);
    expect(project).toMatchObject({
      expectedOutcome: "Transformer l’idée initiale en résultat validé.",
      status: "draft",
      environment: "development",
      repositoryUrl: null,
    });
    expect(projectProgress(project)).toBe(0);
    expect(missionProgress(project.missions[0])).toBe(0);

    for (const task of project.missions[0].tasks) {
      expect(task.status).toBe("todo");
      expect(task.progress).toBe(0);
      expect(taskProgress(task)).toBe(0);
      expect(task.checkpoints.every((checkpoint) => !checkpoint.verified && checkpoint.verifiedAt === null)).toBe(true);
      expect(task.gates.every((gate) => (
        gate.status === "pending"
        && gate.checkedAt === null
        && gate.evidence === null
        && gate.reason === null
      ))).toBe(true);
    }
  });

  it("trims a bounded project name and creates an opaque zero-progress template", () => {
    const serviceDependencies = dependencies();
    const state = initialState(serviceDependencies);
    const nextState = unwrap(createProject(state, { name: "  Projet Santé  " }, serviceDependencies));
    const project = nextState.projects.at(-1)!;

    expect(project.name).toBe("Projet Santé");
    expect(project.id).not.toContain("Projet");
    expect(project.id).not.toContain("Santé");
    expect(nextState.activeProjectId).toBe(project.id);
    expect(projectProgress(project)).toBe(0);
    expect(project.missions[0].tasks.every((task) => task.status === "todo" && task.progress === 0)).toBe(true);
  });

  it("creates the complete project setup atomically with honest activity state", () => {
    const serviceDependencies = dependencies();
    const state = initialState(serviceDependencies);
    const nextState = unwrap(createProject(state, {
      name: "  Portail client  ",
      description: "  Espace de suivi client  ",
      expectedOutcome: "  Permettre le suivi de bout en bout  ",
      status: "active",
      environment: "staging",
      repositoryUrl: "https://github.com/acme/portail.git",
      missionTitle: "  Première livraison  ",
      missionOutcome: "  Un parcours utilisable  ",
      activityLabels: [" Cadrage ", "Implémentation"],
    }, serviceDependencies));
    const project = nextState.projects.at(-1)!;

    expect(project).toMatchObject({
      name: "Portail client",
      description: "Espace de suivi client",
      expectedOutcome: "Permettre le suivi de bout en bout",
      status: "active",
      environment: "staging",
      repositoryUrl: "https://github.com/acme/portail.git",
      activeMissionId: project.missions[0].id,
    });
    expect(project.missions[0]).toMatchObject({
      title: "Première livraison",
      expectedOutcome: "Un parcours utilisable",
    });
    expect(project.missions[0].tasks.map((task) => task.label)).toEqual(["Cadrage", "Implémentation"]);
    expect(project.missions[0].tasks.every((task) => (
      task.status === "todo"
      && task.progress === 0
      && task.checkpoints.length === 1
      && task.checkpoints.every((checkpoint) => !checkpoint.verified)
      && task.gates.length === 3
      && task.gates.every((gate) => gate.required && gate.status === "pending")
      && task.blocker === null
      && task.legacy === null
    ))).toBe(true);
    expect(nextState.revision).toBe(state.revision);
    expect(nextState.savedAt).toBe(state.savedAt);
  });

  it("rejects duplicate setup labels and unsafe repository references without partial creation", () => {
    const serviceDependencies = dependencies();
    const state = initialState(serviceDependencies);

    expect(createProject(state, {
      name: " vision   smart studio ",
    }, serviceDependencies)).toMatchObject({ ok: false, error: { code: "DUPLICATE_PROJECT_NAME" } });
    expect(createProject(state, {
      name: "Projet doublons",
      activityLabels: ["Build", " build "],
    }, serviceDependencies)).toMatchObject({ ok: false, error: { code: "DUPLICATE_ACTIVITY_LABEL" } });
    expect(createProject(state, {
      name: "Projet vide",
      activityLabels: [],
    }, serviceDependencies)).toMatchObject({ ok: false, error: { code: "INVALID_ACTIVITY_LIST" } });
    for (const repositoryUrl of [
      "http://example.com/repo.git",
      "https://user:secret@example.com/repo.git",
      "https://example.com/repo.git?token=secret",
    ]) {
      expect(createProject(state, {
        name: `Projet ${repositoryUrl}`,
        repositoryUrl,
      }, serviceDependencies)).toMatchObject({ ok: false, error: { code: "INVALID_REPOSITORY_URL" } });
    }
    expect(createProject(state, {
      name: "Projet URL longue",
      repositoryUrl: `https://example.com/${"a".repeat(MAX_REPOSITORY_URL_LENGTH)}`,
    }, serviceDependencies)).toMatchObject({ ok: false, error: { code: "REPOSITORY_URL_TOO_LONG" } });
    expect(state.projects).toHaveLength(1);
  });

  it("enforces every bounded setup field and both project enums", () => {
    const serviceDependencies = dependencies();
    const state = initialState(serviceDependencies);
    const cases = [
      {
        command: { name: "Description longue", description: "a".repeat(MAX_PROJECT_DESCRIPTION_LENGTH + 1) },
        code: "PROJECT_DESCRIPTION_TOO_LONG",
      },
      {
        command: { name: "Outcome long", expectedOutcome: "a".repeat(MAX_PROJECT_OUTCOME_LENGTH + 1) },
        code: "PROJECT_OUTCOME_TOO_LONG",
      },
      {
        command: { name: "Mission outcome long", missionOutcome: "a".repeat(MAX_MISSION_OUTCOME_LENGTH + 1) },
        code: "MISSION_OUTCOME_TOO_LONG",
      },
      {
        command: { name: "Activité longue", activityLabels: ["a".repeat(MAX_TASK_LABEL_LENGTH + 1)] },
        code: "ACTIVITY_LABEL_TOO_LONG",
      },
      {
        command: { name: "Statut invalide", status: "archived" as "draft" },
        code: "INVALID_PROJECT_STATUS",
      },
      {
        command: { name: "Environnement invalide", environment: "local" as "development" },
        code: "INVALID_PROJECT_ENVIRONMENT",
      },
    ] as const;

    for (const item of cases) {
      expect(createProject(state, item.command, serviceDependencies)).toMatchObject({
        ok: false,
        error: { code: item.code },
      });
    }
    expect(state.projects).toHaveLength(1);
  });

  it("rejects empty, control-character and oversized project names without mutation", () => {
    const serviceDependencies = dependencies();
    const state = initialState(serviceDependencies);

    const empty = createProject(state, { name: "   " }, serviceDependencies);
    const control = createProject(state, { name: "Projet\nmasqué" }, serviceDependencies);
    const oversized = createProject(
      state,
      { name: "é".repeat(MAX_PROJECT_NAME_LENGTH + 1) },
      serviceDependencies,
    );

    expect(empty).toMatchObject({ ok: false, error: { code: "INVALID_PROJECT_NAME" } });
    expect(control).toMatchObject({ ok: false, error: { code: "INVALID_PROJECT_NAME" } });
    expect(oversized).toMatchObject({ ok: false, error: { code: "PROJECT_NAME_TOO_LONG" } });
    expect(state.projects).toHaveLength(1);
  });

  it("treats an XSS-shaped project name as inert data and never derives the identifier from it", () => {
    const serviceDependencies = dependencies();
    const state = initialState(serviceDependencies);
    const payload = "<img src=x onerror=globalThis.__studioPwned=true>";
    const nextState = unwrap(createProject(state, { name: payload }, serviceDependencies));
    const project = nextState.projects.at(-1)!;

    expect(project.name).toBe(payload);
    expect(project.id).not.toContain("<");
    expect(project.id).not.toContain("onerror");
    expect((globalThis as typeof globalThis & { __studioPwned?: boolean }).__studioPwned).toBeUndefined();
  });

  it("retries generator collisions and fails safely when uniqueness cannot be obtained", () => {
    const seedDependencies = dependencies();
    const state = initialState(seedDependencies);
    const existingId = state.projects[0].id;
    const collisionDependencies = dependencies({ firstIds: [existingId] });
    const created = unwrap(createProject(state, { name: "Projet sans collision" }, collisionDependencies));
    const allIds = created.projects.flatMap((project) => [
      project.id,
      ...project.missions.flatMap((mission) => [
        mission.id,
        ...mission.tasks.flatMap((task) => [
          task.id,
          ...task.checkpoints.map((checkpoint) => checkpoint.id),
          ...task.gates.map((gate) => gate.id),
        ]),
      ]),
    ]);

    expect(new Set(allIds).size).toBe(allIds.length);

    const failed = createProject(
      state,
      { name: "Projet impossible" },
      dependencies({ constantId: existingId }),
    );
    expect(failed).toMatchObject({ ok: false, error: { code: "ID_GENERATION_FAILED" } });
    expect(state.projects).toHaveLength(1);
  });

  it("keeps every transformation immutable and preserves unrelated project references", () => {
    const serviceDependencies = dependencies();
    const first = initialState(serviceDependencies);
    const state = unwrap(createProject(first, { name: "Second projet" }, serviceDependencies));
    const before = structuredClone(state);
    const untouchedProject = state.projects[0];
    const target = firstTarget(state, 1);
    const checkpointId = taskAt(state, target).checkpoints[0].id;

    deepFreeze(state);
    const nextState = unwrap(toggleCheckpoint(
      state,
      { ...target, checkpointId, verified: true },
      serviceDependencies,
    ));

    expect(state).toEqual(before);
    expect(nextState).not.toBe(state);
    expect(nextState.projects[0]).toBe(untouchedProject);
    expect(nextState.projects[1]).not.toBe(state.projects[1]);
    expect(taskAt(nextState, target).progress).toBe(90);
    expect(nextState.revision).toBe(state.revision);
    expect(nextState.savedAt).toBe(state.savedAt);
  });

  it("selects only existing projects and missions without needless revisions", () => {
    const serviceDependencies = dependencies();
    const initial = initialState(serviceDependencies);
    const withSecond = unwrap(createProject(initial, { name: "Second" }, serviceDependencies));
    const firstProject = withSecond.projects[0];
    const selectedProject = unwrap(selectProject(withSecond, firstProject.id, serviceDependencies));
    const stateWithNoActiveMission: StudioStateV3 = {
      ...selectedProject,
      projects: selectedProject.projects.map((project) => (
        project.id === firstProject.id ? { ...project, activeMissionId: null } : project
      )),
    };
    const selectedMission = unwrap(selectMission(
      stateWithNoActiveMission,
      { projectId: firstProject.id, missionId: firstProject.missions[0].id },
      serviceDependencies,
    ));

    expect(selectedProject.activeProjectId).toBe(firstProject.id);
    expect(selectedProject.revision).toBe(withSecond.revision);
    expect(selectedProject.savedAt).toBe(withSecond.savedAt);
    expect(selectedMission.projects[0].activeMissionId).toBe(firstProject.missions[0].id);
    expect(selectProject(selectedMission, "absent", serviceDependencies)).toMatchObject({
      ok: false,
      error: { code: "PROJECT_NOT_FOUND" },
    });
    expect(selectProject(selectedMission, firstProject.id, serviceDependencies)).toEqual({
      ok: true,
      value: selectedMission,
    });
  });

  it("updates bounded project settings immutably and rejects premature completion", () => {
    const serviceDependencies = dependencies();
    const state = initialState(serviceDependencies);
    const project = state.projects[0];
    const updated = unwrap(updateProject(state, {
      projectId: project.id,
      name: "Studio principal",
      description: "Description mise à jour",
      expectedOutcome: "Résultat mesurable",
      status: "paused",
      environment: "production",
      repositoryUrl: "https://git.example.com/team/studio.git",
    }, serviceDependencies));
    const updatedProject = updated.projects[0];

    expect(updatedProject).toMatchObject({
      name: "Studio principal",
      description: "Description mise à jour",
      expectedOutcome: "Résultat mesurable",
      status: "paused",
      environment: "production",
      repositoryUrl: "https://git.example.com/team/studio.git",
    });
    expect(updatedProject.createdAt).toBe(project.createdAt);
    expect(updatedProject.missions).toBe(project.missions);
    expect(updated.revision).toBe(state.revision);
    expect(updateProject(updated, {
      projectId: project.id,
      name: updatedProject.name,
    }, serviceDependencies)).toEqual({ ok: true, value: updated });
    expect(updateProject(state, {
      projectId: project.id,
      status: "completed",
    }, serviceDependencies)).toMatchObject({ ok: false, error: { code: "PROJECT_NOT_READY" } });
    expect(updateProject(state, {
      projectId: project.id,
    }, serviceDependencies)).toMatchObject({ ok: false, error: { code: "INVALID_PROJECT_UPDATE" } });

    const withSecond = unwrap(createProject(state, { name: "Second projet" }, serviceDependencies));
    const secondProject = withSecond.projects.at(-1)!;
    expect(updateProject(withSecond, {
      projectId: secondProject.id,
      name: " vision smart studio ",
    }, serviceDependencies)).toMatchObject({ ok: false, error: { code: "DUPLICATE_PROJECT_NAME" } });
  });

  it("adds missions and activities with scoped duplicate protection and canonical gates", () => {
    const serviceDependencies = dependencies();
    let state = initialState(serviceDependencies);
    const project = state.projects[0];
    state = unwrap(createMission(state, {
      projectId: project.id,
      title: "  Audit final  ",
      expectedOutcome: "  Obtenir un verdict traçable  ",
    }, serviceDependencies));
    const mission = state.projects[0].missions.at(-1)!;

    expect(mission).toMatchObject({ title: "Audit final", expectedOutcome: "Obtenir un verdict traçable", tasks: [] });
    expect(state.projects[0].activeMissionId).toBe(mission.id);
    expect(state.activeProjectId).toBe(project.id);
    expect(createMission(state, {
      projectId: project.id,
      title: " audit   FINAL ",
      expectedOutcome: "Autre résultat",
    }, serviceDependencies)).toMatchObject({ ok: false, error: { code: "DUPLICATE_MISSION_TITLE" } });
    expect(createMission(state, {
      projectId: project.id,
      title: "x".repeat(MAX_MISSION_TITLE_LENGTH + 1),
      expectedOutcome: "Résultat",
    }, serviceDependencies)).toMatchObject({ ok: false, error: { code: "MISSION_TITLE_TOO_LONG" } });

    state = unwrap(createTask(state, {
      projectId: project.id,
      missionId: mission.id,
      label: "  Vérifier la livraison  ",
      weight: 2.5,
    }, serviceDependencies));
    const task = state.projects[0].missions.at(-1)!.tasks[0];
    expect(task).toMatchObject({ label: "Vérifier la livraison", weight: 2.5, status: "todo", progress: 0 });
    expect(task.checkpoints).toHaveLength(1);
    expect(task.gates.map((gate) => gate.label)).toEqual(["Qualité", "Sécurité", "Documentation"]);
    expect(createTask(state, {
      projectId: project.id,
      missionId: mission.id,
      label: " vérifier   LA livraison ",
    }, serviceDependencies)).toMatchObject({ ok: false, error: { code: "DUPLICATE_ACTIVITY_LABEL" } });
    expect(createTask(state, {
      projectId: project.id,
      missionId: mission.id,
      label: "Poids invalide",
      weight: Number.POSITIVE_INFINITY,
    }, serviceDependencies)).toMatchObject({ ok: false, error: { code: "INVALID_TASK_WEIGHT" } });
  });

  it("never marks a task done before checkpoints and mandatory gates are validated", () => {
    const serviceDependencies = dependencies();
    let state = initialState(serviceDependencies);
    const target = firstTarget(state);

    state = verifyAllCheckpoints(state, target, serviceDependencies);
    expect(taskAt(state, target).progress).toBe(90);
    expect(requestTaskCompletion(state, target, serviceDependencies)).toMatchObject({
      ok: false,
      error: { code: "TASK_NOT_READY" },
    });

    state = passAllGates(state, target, serviceDependencies);
    expect(taskAt(state, target).progress).toBe(99);
    expect(taskAt(state, target).status).toBe("in_progress");

    state = unwrap(requestTaskCompletion(state, target, serviceDependencies));
    expect(taskAt(state, target).status).toBe("done");
    expect(taskAt(state, target).progress).toBe(100);
    expect(taskProgress(taskAt(state, target))).toBe(100);
  });

  it("requires evidence for success, a reason for failure, and reopens a completed task", () => {
    const serviceDependencies = dependencies();
    let state = initialState(serviceDependencies);
    const target = firstTarget(state);
    const gateId = taskAt(state, target).gates[0].id;

    expect(recordGateResult(
      state,
      { ...target, gateId, status: "passed" },
      serviceDependencies,
    )).toMatchObject({ ok: false, error: { code: "INVALID_GATE_RESULT" } });
    expect(recordGateResult(
      state,
      { ...target, gateId, status: "failed" },
      serviceDependencies,
    )).toMatchObject({ ok: false, error: { code: "INVALID_GATE_RESULT" } });

    state = verifyAllCheckpoints(state, target, serviceDependencies);
    state = passAllGates(state, target, serviceDependencies);
    state = unwrap(requestTaskCompletion(state, target, serviceDependencies));
    expect(taskAt(state, target).status).toBe("done");

    state = unwrap(recordGateResult(
      state,
      {
        ...target,
        gateId,
        status: "failed",
        evidence: "rapport:test-42",
        reason: "Une régression a été détectée.",
      },
      serviceDependencies,
    ));
    const reopenedTask = taskAt(state, target);
    const failedGate = reopenedTask.gates.find((gate) => gate.id === gateId)!;

    expect(reopenedTask.status).toBe("in_progress");
    expect(reopenedTask.progress).toBeLessThan(100);
    expect(failedGate.status).toBe("failed");
    expect(failedGate.evidence).toBe("rapport:test-42");
    expect(failedGate.reason).toBe("Une régression a été détectée.");
  });

  it("reopens a completed task when a verified checkpoint is withdrawn", () => {
    const serviceDependencies = dependencies();
    let state = initialState(serviceDependencies);
    const target = firstTarget(state);
    const checkpointId = taskAt(state, target).checkpoints[0].id;

    state = verifyAllCheckpoints(state, target, serviceDependencies);
    state = passAllGates(state, target, serviceDependencies);
    state = unwrap(requestTaskCompletion(state, target, serviceDependencies));
    state = unwrap(toggleCheckpoint(
      state,
      { ...target, checkpointId, verified: false },
      serviceDependencies,
    ));

    expect(taskAt(state, target).status).toBe("in_progress");
    expect(taskAt(state, target).progress).toBe(10);
    expect(taskAt(state, target).checkpoints[0].verifiedAt).toBeNull();
  });

  it("only completes a fully validated project and reactivates it when work reopens", () => {
    const serviceDependencies = dependencies();
    let state = initialState(serviceDependencies);
    const projectId = state.projects[0].id;
    const missionId = state.projects[0].missions[0].id;
    const taskIds = state.projects[0].missions[0].tasks.map((task) => task.id);

    for (const taskId of taskIds) {
      const target = { projectId, missionId, taskId };
      state = verifyAllCheckpoints(state, target, serviceDependencies);
      state = passAllGates(state, target, serviceDependencies);
      state = unwrap(requestTaskCompletion(state, target, serviceDependencies));
    }
    state = unwrap(updateProject(state, { projectId, status: "completed" }, serviceDependencies));
    expect(state.projects[0].status).toBe("completed");
    expect(projectProgress(state.projects[0])).toBe(100);

    const reopenedTarget = { projectId, missionId, taskId: taskIds[0] };
    state = unwrap(toggleCheckpoint(state, {
      ...reopenedTarget,
      checkpointId: taskAt(state, reopenedTarget).checkpoints[0].id,
      verified: false,
    }, serviceDependencies));
    expect(state.projects[0].status).toBe("active");
    expect(projectProgress(state.projects[0])).toBeLessThan(100);
  });

  it("blocks and explicitly unblocks work while preserving completion gates", () => {
    const serviceDependencies = dependencies();
    let state = initialState(serviceDependencies);
    const target = firstTarget(state);

    state = verifyAllCheckpoints(state, target, serviceDependencies);
    state = passAllGates(state, target, serviceDependencies);
    state = unwrap(blockTask(
      state,
      {
        ...target,
        reason: "Autorisation externe manquante",
        requiredAction: "Obtenir l’autorisation",
        resumeCondition: "Autorisation jointe au dossier",
      },
      serviceDependencies,
    ));

    expect(taskAt(state, target).status).toBe("blocked");
    expect(taskAt(state, target).blocker).toMatchObject({
      reason: "Autorisation externe manquante",
      requiredAction: "Obtenir l’autorisation",
      resumeCondition: "Autorisation jointe au dossier",
    });
    expect(requestTaskCompletion(state, target, serviceDependencies)).toMatchObject({
      ok: false,
      error: { code: "TASK_BLOCKED" },
    });
    expect(toggleCheckpoint(
      state,
      { ...target, checkpointId: taskAt(state, target).checkpoints[0].id },
      serviceDependencies,
    )).toMatchObject({ ok: false, error: { code: "TASK_BLOCKED" } });

    state = unwrap(unblockTask(state, target, serviceDependencies));
    expect(taskAt(state, target).blocker).toBeNull();
    expect(taskAt(state, target).status).toBe("in_progress");
    expect(taskAt(state, target).progress).toBe(99);

    state = unwrap(requestTaskCompletion(state, target, serviceDependencies));
    expect(taskAt(state, target).status).toBe("done");
    expect(taskAt(state, target).progress).toBe(100);
  });

  it("accepts a reasoned not-applicable verdict without fabricating evidence", () => {
    const serviceDependencies = dependencies();
    let state = initialState(serviceDependencies);
    const target = firstTarget(state);
    const [notApplicableGate, ...otherGates] = taskAt(state, target).gates;

    state = verifyAllCheckpoints(state, target, serviceDependencies);
    state = unwrap(recordGateResult(
      state,
      {
        ...target,
        gateId: notApplicableGate.id,
        status: "not_applicable",
        reason: "Aucune donnée sensible dans ce lot local.",
      },
      serviceDependencies,
    ));
    for (const gate of otherGates) {
      state = unwrap(recordGateResult(
        state,
        { ...target, gateId: gate.id, status: "passed", evidence: `preuve:${gate.id}` },
        serviceDependencies,
      ));
    }
    state = unwrap(requestTaskCompletion(state, target, serviceDependencies));

    const gate = taskAt(state, target).gates.find((item) => item.id === notApplicableGate.id)!;
    expect(gate.status).toBe("not_applicable");
    expect(gate.reason).toBe("Aucune donnée sensible dans ce lot local.");
    expect(gate.evidence).toBeNull();
    expect(taskAt(state, target).status).toBe("done");
  });
});
