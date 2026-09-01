import {
  canMarkTaskDone,
  taskProgress,
} from "./studio-progress";
import type {
  GateStatus,
  StudioBlocker,
  StudioCheckpoint,
  StudioMissionV3,
  StudioProjectV3,
  StudioStateV3,
  StudioTaskV3,
  StudioValidationGate,
} from "./studio-types";

export const MAX_PROJECT_NAME_LENGTH = 120;

const MAX_ID_LENGTH = 160;
const MAX_ID_ATTEMPTS = 32;
const MAX_EVIDENCE_LENGTH = 2_000;
const MAX_REASON_LENGTH = 1_000;
const MAX_BLOCKER_FIELD_LENGTH = 1_000;

export type StudioIdKind = "project" | "mission" | "task" | "checkpoint" | "gate";

export type StudioServiceDependencies = {
  now: () => string;
  createId: (kind: StudioIdKind) => string;
};

export type StudioServiceErrorCode =
  | "INVALID_PROJECT_NAME"
  | "PROJECT_NAME_TOO_LONG"
  | "ID_GENERATION_FAILED"
  | "PROJECT_NOT_FOUND"
  | "MISSION_NOT_FOUND"
  | "TASK_NOT_FOUND"
  | "CHECKPOINT_NOT_FOUND"
  | "GATE_NOT_FOUND"
  | "INVALID_GATE_RESULT"
  | "INVALID_BLOCKER"
  | "TASK_BLOCKED"
  | "TASK_NOT_READY";

export type StudioServiceError = {
  code: StudioServiceErrorCode;
  message: string;
};

export type StudioServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: StudioServiceError };

export type CreateProjectCommand = {
  name: string;
};

export type SelectMissionCommand = {
  projectId: string;
  missionId: string;
};

export type TaskTarget = SelectMissionCommand & {
  taskId: string;
};

export type ToggleCheckpointCommand = TaskTarget & {
  checkpointId: string;
  verified?: boolean;
};

export type RecordGateResultCommand = TaskTarget & {
  gateId: string;
  status: GateStatus;
  evidence?: string | null;
  reason?: string | null;
};

export type BlockTaskCommand = TaskTarget & {
  reason: string;
  requiredAction: string;
  resumeCondition: string;
};

type TaskMutation = (
  task: StudioTaskV3,
  timestamp: string,
) => StudioServiceResult<StudioTaskV3>;

function success<T>(value: T): StudioServiceResult<T> {
  return { ok: true, value };
}

function failure<T>(code: StudioServiceErrorCode, message: string): StudioServiceResult<T> {
  return { ok: false, error: { code, message } };
}

function collectEntityIds(state: StudioStateV3): Set<string> {
  const ids = new Set<string>();

  for (const project of state.projects) {
    ids.add(project.id);
    for (const mission of project.missions) {
      ids.add(mission.id);
      for (const task of mission.tasks) {
        ids.add(task.id);
        task.checkpoints.forEach((checkpoint) => ids.add(checkpoint.id));
        task.gates.forEach((gate) => ids.add(gate.id));
      }
    }
  }

  return ids;
}

function allocateId(
  kind: StudioIdKind,
  dependencies: StudioServiceDependencies,
  allocatedIds: Set<string>,
): StudioServiceResult<string> {
  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
    let candidate: unknown;

    try {
      candidate = dependencies.createId(kind);
    } catch {
      continue;
    }

    if (
      typeof candidate !== "string"
      || candidate.length === 0
      || candidate.length > MAX_ID_LENGTH
      || candidate.trim() !== candidate
      || allocatedIds.has(candidate)
    ) {
      continue;
    }

    allocatedIds.add(candidate);
    return success(candidate);
  }

  return failure(
    "ID_GENERATION_FAILED",
    `Impossible de générer un identifiant ${kind} unique et valide.`,
  );
}

function normalizeProjectName(name: unknown): StudioServiceResult<string> {
  if (typeof name !== "string") {
    return failure("INVALID_PROJECT_NAME", "Le nom du projet doit être une chaîne de caractères.");
  }

  const normalizedName = name.trim();
  if (!normalizedName || /[\u0000-\u001F\u007F]/u.test(normalizedName)) {
    return failure("INVALID_PROJECT_NAME", "Le nom du projet est vide ou contient des caractères de contrôle.");
  }

  if (Array.from(normalizedName).length > MAX_PROJECT_NAME_LENGTH) {
    return failure(
      "PROJECT_NAME_TOO_LONG",
      `Le nom du projet ne doit pas dépasser ${MAX_PROJECT_NAME_LENGTH} caractères.`,
    );
  }

  return success(normalizedName);
}

function normalizeOptionalText(value: string | null | undefined, maximumLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maximumLength);
}

function normalizeRequiredText(
  value: unknown,
  maximumLength: number,
  code: "INVALID_GATE_RESULT" | "INVALID_BLOCKER",
  message: string,
): StudioServiceResult<string> {
  if (typeof value !== "string") return failure(code, message);
  const normalized = value.trim();
  if (!normalized || normalized.length > maximumLength) return failure(code, message);
  return success(normalized);
}

function pendingGate(id: string, label: string): StudioValidationGate {
  return {
    id,
    label,
    required: true,
    status: "pending",
    checkedAt: null,
    evidence: null,
    reason: null,
  };
}

function buildTemplateTask(
  label: string,
  dependencies: StudioServiceDependencies,
  allocatedIds: Set<string>,
): StudioServiceResult<StudioTaskV3> {
  const taskId = allocateId("task", dependencies, allocatedIds);
  if (!taskId.ok) return taskId;

  const checkpointId = allocateId("checkpoint", dependencies, allocatedIds);
  if (!checkpointId.ok) return checkpointId;

  const gateDefinitions = [
    ["Qualité", "gate"] as const,
    ["Sécurité", "gate"] as const,
    ["Documentation", "gate"] as const,
  ];
  const gates: StudioValidationGate[] = [];

  for (const [gateLabel, gateKind] of gateDefinitions) {
    const gateId = allocateId(gateKind, dependencies, allocatedIds);
    if (!gateId.ok) return gateId;
    gates.push(pendingGate(gateId.value, gateLabel));
  }

  const checkpoint: StudioCheckpoint = {
    id: checkpointId.value,
    label: "Résultat fonctionnel vérifié",
    weight: 1,
    verified: false,
    verifiedAt: null,
  };

  return success({
    id: taskId.value,
    label,
    status: "todo",
    weight: 1,
    progress: 0,
    checkpoints: [checkpoint],
    gates,
    blocker: null,
    legacy: null,
  });
}

function buildProject(
  name: string,
  timestamp: string,
  dependencies: StudioServiceDependencies,
  allocatedIds: Set<string>,
): StudioServiceResult<StudioProjectV3> {
  const projectId = allocateId("project", dependencies, allocatedIds);
  if (!projectId.ok) return projectId;

  const missionId = allocateId("mission", dependencies, allocatedIds);
  if (!missionId.ok) return missionId;

  const taskLabels = ["Cadrage du besoin", "Architecture", "Livraison"];
  const tasks: StudioTaskV3[] = [];

  for (const taskLabel of taskLabels) {
    const task = buildTemplateTask(taskLabel, dependencies, allocatedIds);
    if (!task.ok) return task;
    tasks.push(task.value);
  }

  const mission: StudioMissionV3 = {
    id: missionId.value,
    title: "Mission principale",
    expectedOutcome: "Transformer l’idée initiale en résultat validé.",
    tasks,
  };

  return success({
    id: projectId.value,
    name,
    description: "Nouveau projet Vision Smart Studio",
    createdAt: timestamp,
    updatedAt: timestamp,
    activeMissionId: mission.id,
    missions: [mission],
  });
}

function touchState(
  state: StudioStateV3,
  projects: StudioProjectV3[],
  activeProjectId: string | null,
): StudioStateV3 {
  return {
    ...state,
    activeProjectId,
    projects,
  };
}

function taskHasActivity(task: StudioTaskV3): boolean {
  return task.checkpoints.some((checkpoint) => checkpoint.verified)
    || task.gates.some((gate) => gate.status !== "pending");
}

function synchronizeTask(task: StudioTaskV3, forceReopen = false): StudioTaskV3 {
  const progress = taskProgress(task);
  const withProgress = { ...task, progress };

  if (withProgress.blocker) return { ...withProgress, status: "blocked" };
  if (!forceReopen && task.status === "done" && canMarkTaskDone(withProgress)) {
    return { ...withProgress, status: "done" };
  }

  return {
    ...withProgress,
    status: progress > 0 || taskHasActivity(withProgress) ? "in_progress" : "todo",
  };
}

function updateTask(
  state: StudioStateV3,
  target: TaskTarget,
  dependencies: StudioServiceDependencies,
  mutation: TaskMutation,
): StudioServiceResult<StudioStateV3> {
  const projectIndex = state.projects.findIndex((project) => project.id === target.projectId);
  if (projectIndex < 0) return failure("PROJECT_NOT_FOUND", "Projet introuvable.");

  const project = state.projects[projectIndex];
  const missionIndex = project.missions.findIndex((mission) => mission.id === target.missionId);
  if (missionIndex < 0) return failure("MISSION_NOT_FOUND", "Mission introuvable dans ce projet.");

  const mission = project.missions[missionIndex];
  const taskIndex = mission.tasks.findIndex((task) => task.id === target.taskId);
  if (taskIndex < 0) return failure("TASK_NOT_FOUND", "Tâche introuvable dans cette mission.");

  const timestamp = dependencies.now();
  const nextTask = mutation(mission.tasks[taskIndex], timestamp);
  if (!nextTask.ok) return nextTask;
  if (nextTask.value === mission.tasks[taskIndex]) return success(state);

  const tasks = mission.tasks.map((task, index) => (index === taskIndex ? nextTask.value : task));
  const missions = project.missions.map((item, index) => (
    index === missionIndex ? { ...mission, tasks } : item
  ));
  const projects = state.projects.map((item, index) => (
    index === projectIndex ? { ...project, missions, updatedAt: timestamp } : item
  ));

  return success(touchState(state, projects, state.activeProjectId));
}

export function createInitialStudioState(
  dependencies: StudioServiceDependencies,
): StudioServiceResult<StudioStateV3> {
  const timestamp = dependencies.now();
  const project = buildProject(
    "Vision Smart Studio",
    timestamp,
    dependencies,
    new Set<string>(),
  );
  if (!project.ok) return project;

  return success({
    version: 3,
    revision: 0,
    savedAt: timestamp,
    activeProjectId: project.value.id,
    projects: [project.value],
  });
}

export function createProject(
  state: StudioStateV3,
  command: CreateProjectCommand,
  dependencies: StudioServiceDependencies,
): StudioServiceResult<StudioStateV3> {
  const name = normalizeProjectName(command.name);
  if (!name.ok) return name;

  const timestamp = dependencies.now();
  const project = buildProject(
    name.value,
    timestamp,
    dependencies,
    collectEntityIds(state),
  );
  if (!project.ok) return project;

  return success(touchState(
    state,
    [...state.projects, project.value],
    project.value.id,
  ));
}

export function selectProject(
  state: StudioStateV3,
  projectId: string,
  dependencies: StudioServiceDependencies,
): StudioServiceResult<StudioStateV3> {
  if (!state.projects.some((project) => project.id === projectId)) {
    return failure("PROJECT_NOT_FOUND", "Projet introuvable.");
  }
  if (state.activeProjectId === projectId) return success(state);

  return success(touchState(
    state,
    state.projects,
    projectId,
  ));
}

export function selectMission(
  state: StudioStateV3,
  command: SelectMissionCommand,
  dependencies: StudioServiceDependencies,
): StudioServiceResult<StudioStateV3> {
  const projectIndex = state.projects.findIndex((project) => project.id === command.projectId);
  if (projectIndex < 0) return failure("PROJECT_NOT_FOUND", "Projet introuvable.");

  const project = state.projects[projectIndex];
  if (!project.missions.some((mission) => mission.id === command.missionId)) {
    return failure("MISSION_NOT_FOUND", "Mission introuvable dans ce projet.");
  }
  if (state.activeProjectId === project.id && project.activeMissionId === command.missionId) {
    return success(state);
  }

  const timestamp = dependencies.now();
  const projects = state.projects.map((item, index) => (
    index === projectIndex
      ? { ...project, activeMissionId: command.missionId, updatedAt: timestamp }
      : item
  ));

  return success(touchState(state, projects, project.id));
}

export function toggleCheckpoint(
  state: StudioStateV3,
  command: ToggleCheckpointCommand,
  dependencies: StudioServiceDependencies,
): StudioServiceResult<StudioStateV3> {
  return updateTask(state, command, dependencies, (task, timestamp) => {
    if (task.blocker) return failure("TASK_BLOCKED", "La tâche doit être débloquée avant de progresser.");

    const checkpointIndex = task.checkpoints.findIndex(
      (checkpoint) => checkpoint.id === command.checkpointId,
    );
    if (checkpointIndex < 0) return failure("CHECKPOINT_NOT_FOUND", "Checkpoint introuvable.");

    const checkpoint = task.checkpoints[checkpointIndex];
    const verified = command.verified ?? !checkpoint.verified;
    if (checkpoint.verified === verified) return success(task);

    const checkpoints = task.checkpoints.map((item, index) => (
      index === checkpointIndex
        ? { ...checkpoint, verified, verifiedAt: verified ? timestamp : null }
        : item
    ));

    return success(synchronizeTask({ ...task, checkpoints }, !verified));
  });
}

export function recordGateResult(
  state: StudioStateV3,
  command: RecordGateResultCommand,
  dependencies: StudioServiceDependencies,
): StudioServiceResult<StudioStateV3> {
  return updateTask(state, command, dependencies, (task, timestamp) => {
    const gateIndex = task.gates.findIndex((gate) => gate.id === command.gateId);
    if (gateIndex < 0) return failure("GATE_NOT_FOUND", "Gate de validation introuvable.");

    const gate = task.gates[gateIndex];
    let evidence: string | null = null;
    let reason: string | null = null;
    let checkedAt: string | null = timestamp;

    if (command.status === "passed") {
      const normalizedEvidence = normalizeRequiredText(
        command.evidence,
        MAX_EVIDENCE_LENGTH,
        "INVALID_GATE_RESULT",
        "Une preuve est obligatoire pour valider un gate.",
      );
      if (!normalizedEvidence.ok) return normalizedEvidence;
      evidence = normalizedEvidence.value;
    } else if (command.status === "failed" || command.status === "not_applicable") {
      const normalizedReason = normalizeRequiredText(
        command.reason,
        MAX_REASON_LENGTH,
        "INVALID_GATE_RESULT",
        "Une raison est obligatoire pour un gate échoué ou non applicable.",
      );
      if (!normalizedReason.ok) return normalizedReason;
      reason = normalizedReason.value;
      evidence = normalizeOptionalText(command.evidence, MAX_EVIDENCE_LENGTH);
    } else {
      checkedAt = null;
    }

    const nextGate: StudioValidationGate = {
      ...gate,
      status: command.status,
      checkedAt,
      evidence,
      reason,
    };
    const gates = task.gates.map((item, index) => (index === gateIndex ? nextGate : item));
    const forceReopen = command.status !== "passed";

    return success(synchronizeTask({ ...task, gates }, forceReopen));
  });
}

export function requestTaskCompletion(
  state: StudioStateV3,
  target: TaskTarget,
  dependencies: StudioServiceDependencies,
): StudioServiceResult<StudioStateV3> {
  return updateTask(state, target, dependencies, (task) => {
    if (task.blocker) return failure("TASK_BLOCKED", "Une tâche bloquée ne peut pas être terminée.");

    const synchronizedTask = synchronizeTask(task);
    if (!canMarkTaskDone(synchronizedTask)) {
      return failure(
        "TASK_NOT_READY",
        "Tous les checkpoints et gates obligatoires doivent être validés avant la clôture.",
      );
    }
    if (task.status === "done" && task.progress === 100) return success(task);

    const completedTask = { ...synchronizedTask, status: "done" as const };
    return success({ ...completedTask, progress: taskProgress(completedTask) });
  });
}

export function blockTask(
  state: StudioStateV3,
  command: BlockTaskCommand,
  dependencies: StudioServiceDependencies,
): StudioServiceResult<StudioStateV3> {
  return updateTask(state, command, dependencies, (task, timestamp) => {
    const reason = normalizeRequiredText(
      command.reason,
      MAX_BLOCKER_FIELD_LENGTH,
      "INVALID_BLOCKER",
      "Le motif du blocage est obligatoire.",
    );
    if (!reason.ok) return reason;
    const requiredAction = normalizeRequiredText(
      command.requiredAction,
      MAX_BLOCKER_FIELD_LENGTH,
      "INVALID_BLOCKER",
      "L’action requise pour lever le blocage est obligatoire.",
    );
    if (!requiredAction.ok) return requiredAction;
    const resumeCondition = normalizeRequiredText(
      command.resumeCondition,
      MAX_BLOCKER_FIELD_LENGTH,
      "INVALID_BLOCKER",
      "La condition de reprise est obligatoire.",
    );
    if (!resumeCondition.ok) return resumeCondition;

    const blocker: StudioBlocker = {
      reason: reason.value,
      requiredAction: requiredAction.value,
      resumeCondition: resumeCondition.value,
      blockedAt: timestamp,
    };

    return success(synchronizeTask({ ...task, blocker }, true));
  });
}

export function unblockTask(
  state: StudioStateV3,
  target: TaskTarget,
  dependencies: StudioServiceDependencies,
): StudioServiceResult<StudioStateV3> {
  return updateTask(state, target, dependencies, (task) => {
    if (!task.blocker) return success(task);
    return success(synchronizeTask({ ...task, blocker: null }, true));
  });
}
