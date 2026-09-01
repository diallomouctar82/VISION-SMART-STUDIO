import {
  canMarkTaskDone,
  projectProgress,
  taskProgress,
} from "./studio-progress";
import type {
  GateStatus,
  ProjectEnvironment,
  ProjectStatus,
  StudioBlocker,
  StudioCheckpoint,
  StudioMissionV3,
  StudioProjectV3,
  StudioStateV3,
  StudioTaskV3,
  StudioValidationGate,
} from "./studio-types";

export const MAX_PROJECT_NAME_LENGTH = 120;
export const MAX_PROJECT_DESCRIPTION_LENGTH = 2_000;
export const MAX_PROJECT_OUTCOME_LENGTH = 2_000;
export const MAX_MISSION_TITLE_LENGTH = 160;
export const MAX_MISSION_OUTCOME_LENGTH = 2_000;
export const MAX_TASK_LABEL_LENGTH = 240;
export const MAX_REPOSITORY_URL_LENGTH = 2_048;
export const MAX_INITIAL_ACTIVITY_COUNT = 50;
export const MAX_MISSIONS_PER_PROJECT = 100;
export const MAX_TASKS_PER_MISSION = 200;
export const MAX_TASK_WEIGHT = 1_000_000;
export const MAX_ENTITY_ID_LENGTH = 160;
export const MAX_GATE_EVIDENCE_LENGTH = 2_000;
export const MAX_GATE_REASON_LENGTH = 1_000;
export const MAX_BLOCKER_FIELD_LENGTH = 1_000;

const MAX_ID_ATTEMPTS = 32;

const DEFAULT_PROJECT_DESCRIPTION = "Nouveau projet Vision Smart Studio";
const DEFAULT_PROJECT_OUTCOME = "Transformer l’idée initiale en résultat validé.";
const DEFAULT_MISSION_TITLE = "Mission principale";
const DEFAULT_MISSION_OUTCOME = "Transformer l’idée initiale en résultat validé.";
const DEFAULT_ACTIVITY_LABELS = ["Cadrage du besoin", "Architecture", "Livraison"] as const;
const PROJECT_STATUSES: readonly ProjectStatus[] = ["draft", "active", "paused", "completed"];
const PROJECT_ENVIRONMENTS: readonly ProjectEnvironment[] = ["development", "staging", "production"];
const GATE_STATUSES: readonly GateStatus[] = ["pending", "passed", "failed", "not_applicable"];

export type StudioIdKind = "project" | "mission" | "task" | "checkpoint" | "gate";

export type StudioServiceDependencies = {
  now: () => string;
  createId: (kind: StudioIdKind) => string;
};

export type StudioServiceErrorCode =
  | "INVALID_PROJECT_NAME"
  | "PROJECT_NAME_TOO_LONG"
  | "INVALID_PROJECT_DESCRIPTION"
  | "PROJECT_DESCRIPTION_TOO_LONG"
  | "INVALID_PROJECT_OUTCOME"
  | "PROJECT_OUTCOME_TOO_LONG"
  | "INVALID_PROJECT_STATUS"
  | "INVALID_PROJECT_ENVIRONMENT"
  | "INVALID_REPOSITORY_URL"
  | "REPOSITORY_URL_TOO_LONG"
  | "INVALID_PROJECT_UPDATE"
  | "DUPLICATE_PROJECT_NAME"
  | "PROJECT_NOT_READY"
  | "PROJECT_COMPLETED"
  | "INVALID_MISSION_TITLE"
  | "MISSION_TITLE_TOO_LONG"
  | "INVALID_MISSION_OUTCOME"
  | "MISSION_OUTCOME_TOO_LONG"
  | "DUPLICATE_MISSION_TITLE"
  | "TOO_MANY_MISSIONS"
  | "INVALID_ACTIVITY_LIST"
  | "INVALID_ACTIVITY_LABEL"
  | "ACTIVITY_LABEL_TOO_LONG"
  | "DUPLICATE_ACTIVITY_LABEL"
  | "TOO_MANY_ACTIVITIES"
  | "INVALID_TASK_WEIGHT"
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
  description?: string;
  expectedOutcome?: string;
  status?: ProjectStatus;
  environment?: ProjectEnvironment;
  repositoryUrl?: string | null;
  missionTitle?: string;
  missionOutcome?: string;
  activityLabels?: readonly string[];
};

export type UpdateProjectCommand = {
  projectId: string;
  name?: string;
  description?: string;
  expectedOutcome?: string;
  status?: ProjectStatus;
  environment?: ProjectEnvironment;
  repositoryUrl?: string | null;
};

export type CreateMissionCommand = {
  projectId: string;
  title: string;
  expectedOutcome: string;
};

export type CreateTaskCommand = {
  projectId: string;
  missionId: string;
  label: string;
  weight?: number;
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
      || Array.from(candidate).length > MAX_ENTITY_ID_LENGTH
      || candidate.trim() !== candidate
      || /[\u0000-\u001F\u007F]/u.test(candidate)
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

function comparableLabel(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/gu, "\n");
}

function hasForbiddenControlCharacter(value: string, allowMultiline: boolean): boolean {
  return allowMultiline
    ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value)
    : /[\u0000-\u001F\u007F]/u.test(value);
}

function normalizeBoundedText(
  value: unknown,
  maximumLength: number,
  invalidCode: StudioServiceErrorCode,
  tooLongCode: StudioServiceErrorCode,
  fieldLabel: string,
  allowMultiline = false,
): StudioServiceResult<string> {
  if (typeof value !== "string") {
    return failure(invalidCode, `${fieldLabel} doit être une chaîne de caractères.`);
  }
  const normalized = (allowMultiline ? normalizeLineEndings(value) : value).trim();
  if (!normalized || hasForbiddenControlCharacter(normalized, allowMultiline)) {
    return failure(invalidCode, `${fieldLabel} est vide ou contient des caractères de contrôle.`);
  }
  if (Array.from(normalized).length > maximumLength) {
    return failure(tooLongCode, `${fieldLabel} ne doit pas dépasser ${maximumLength} caractères.`);
  }
  return success(normalized);
}

function normalizeProjectDescription(value: unknown): StudioServiceResult<string> {
  return normalizeBoundedText(
    value,
    MAX_PROJECT_DESCRIPTION_LENGTH,
    "INVALID_PROJECT_DESCRIPTION",
    "PROJECT_DESCRIPTION_TOO_LONG",
    "La description du projet",
    true,
  );
}

function normalizeProjectOutcome(value: unknown): StudioServiceResult<string> {
  return normalizeBoundedText(
    value,
    MAX_PROJECT_OUTCOME_LENGTH,
    "INVALID_PROJECT_OUTCOME",
    "PROJECT_OUTCOME_TOO_LONG",
    "Le résultat attendu du projet",
    true,
  );
}

function normalizeMissionTitle(value: unknown): StudioServiceResult<string> {
  return normalizeBoundedText(
    value,
    MAX_MISSION_TITLE_LENGTH,
    "INVALID_MISSION_TITLE",
    "MISSION_TITLE_TOO_LONG",
    "Le titre de la mission",
  );
}

function normalizeMissionOutcome(value: unknown): StudioServiceResult<string> {
  return normalizeBoundedText(
    value,
    MAX_MISSION_OUTCOME_LENGTH,
    "INVALID_MISSION_OUTCOME",
    "MISSION_OUTCOME_TOO_LONG",
    "Le résultat attendu de la mission",
    true,
  );
}

function normalizeActivityLabel(value: unknown): StudioServiceResult<string> {
  return normalizeBoundedText(
    value,
    MAX_TASK_LABEL_LENGTH,
    "INVALID_ACTIVITY_LABEL",
    "ACTIVITY_LABEL_TOO_LONG",
    "Le libellé de l’activité",
  );
}

function normalizeProjectStatus(value: unknown): StudioServiceResult<ProjectStatus> {
  if (typeof value !== "string" || !PROJECT_STATUSES.includes(value as ProjectStatus)) {
    return failure("INVALID_PROJECT_STATUS", "Le statut du projet est inconnu.");
  }
  return success(value as ProjectStatus);
}

function normalizeProjectEnvironment(value: unknown): StudioServiceResult<ProjectEnvironment> {
  if (typeof value !== "string" || !PROJECT_ENVIRONMENTS.includes(value as ProjectEnvironment)) {
    return failure("INVALID_PROJECT_ENVIRONMENT", "L’environnement cible du projet est inconnu.");
  }
  return success(value as ProjectEnvironment);
}

function normalizeRepositoryUrl(value: unknown): StudioServiceResult<string | null> {
  if (value === null || value === undefined || value === "") return success(null);
  if (typeof value !== "string") {
    return failure("INVALID_REPOSITORY_URL", "La référence du dépôt doit être une URL HTTPS ou null.");
  }
  const normalized = value.trim();
  if (!normalized) return success(null);
  if (Array.from(normalized).length > MAX_REPOSITORY_URL_LENGTH) {
    return failure(
      "REPOSITORY_URL_TOO_LONG",
      `L’URL du dépôt ne doit pas dépasser ${MAX_REPOSITORY_URL_LENGTH} caractères.`,
    );
  }
  if (/[\u0000-\u0020\u007F]/u.test(normalized)) {
    return failure("INVALID_REPOSITORY_URL", "L’URL du dépôt contient des caractères interdits.");
  }

  try {
    const parsed = new URL(normalized);
    const hasUserInfo = normalized.slice("https://".length).split(/[/?#]/u, 1)[0].includes("@");
    if (
      parsed.protocol !== "https:"
      || !parsed.hostname
      || hasUserInfo
      || parsed.search
      || parsed.hash
    ) {
      return failure(
        "INVALID_REPOSITORY_URL",
        "L’URL du dépôt doit être HTTPS et ne contenir ni identifiants, ni paramètres, ni fragment.",
      );
    }
  } catch {
    return failure("INVALID_REPOSITORY_URL", "La référence du dépôt n’est pas une URL HTTPS valide.");
  }

  return success(normalized);
}

function normalizeActivityLabels(value: unknown): StudioServiceResult<string[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return failure("INVALID_ACTIVITY_LIST", "Au moins une activité initiale est obligatoire.");
  }
  if (value.length > MAX_INITIAL_ACTIVITY_COUNT) {
    return failure(
      "TOO_MANY_ACTIVITIES",
      `Un projet ne peut pas créer plus de ${MAX_INITIAL_ACTIVITY_COUNT} activités initiales.`,
    );
  }

  const labels: string[] = [];
  const keys = new Set<string>();
  for (const candidate of value) {
    const label = normalizeActivityLabel(candidate);
    if (!label.ok) return label;
    const key = comparableLabel(label.value);
    if (keys.has(key)) {
      return failure("DUPLICATE_ACTIVITY_LABEL", `L’activité « ${label.value} » est dupliquée.`);
    }
    keys.add(key);
    labels.push(label.value);
  }
  return success(labels);
}

function normalizeOptionalText(
  value: string | null | undefined,
  maximumLength: number,
): StudioServiceResult<string | null> {
  if (value === null || value === undefined) return success(null);
  if (typeof value !== "string") {
    return failure("INVALID_GATE_RESULT", "La preuve optionnelle doit être une chaîne de caractères.");
  }
  const normalized = normalizeLineEndings(value).trim();
  if (!normalized) return success(null);
  if (
    Array.from(normalized).length > maximumLength
    || hasForbiddenControlCharacter(normalized, true)
  ) {
    return failure(
      "INVALID_GATE_RESULT",
      "La preuve optionnelle ne doit pas dépasser "
        + maximumLength
        + " caractères ni contenir de caractère de contrôle.",
    );
  }
  return success(normalized);
}

function normalizeRequiredText(
  value: unknown,
  maximumLength: number,
  code: "INVALID_GATE_RESULT" | "INVALID_BLOCKER",
  message: string,
): StudioServiceResult<string> {
  if (typeof value !== "string") return failure(code, message);
  const normalized = normalizeLineEndings(value).trim();
  if (
    !normalized
    || Array.from(normalized).length > maximumLength
    || hasForbiddenControlCharacter(normalized, true)
  ) {
    return failure(code, message);
  }
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

type NormalizedProjectInput = {
  name: string;
  description: string;
  expectedOutcome: string;
  status: ProjectStatus;
  environment: ProjectEnvironment;
  repositoryUrl: string | null;
  missionTitle: string;
  missionOutcome: string;
  activityLabels: string[];
};

function normalizeCreateProjectCommand(
  command: CreateProjectCommand,
): StudioServiceResult<NormalizedProjectInput> {
  const name = normalizeProjectName(command.name);
  if (!name.ok) return name;
  const description = normalizeProjectDescription(command.description ?? DEFAULT_PROJECT_DESCRIPTION);
  if (!description.ok) return description;
  const expectedOutcome = normalizeProjectOutcome(command.expectedOutcome ?? DEFAULT_PROJECT_OUTCOME);
  if (!expectedOutcome.ok) return expectedOutcome;
  const status = normalizeProjectStatus(command.status ?? "draft");
  if (!status.ok) return status;
  const environment = normalizeProjectEnvironment(command.environment ?? "development");
  if (!environment.ok) return environment;
  const repositoryUrl = normalizeRepositoryUrl(command.repositoryUrl);
  if (!repositoryUrl.ok) return repositoryUrl;
  const missionTitle = normalizeMissionTitle(command.missionTitle ?? DEFAULT_MISSION_TITLE);
  if (!missionTitle.ok) return missionTitle;
  const missionOutcome = normalizeMissionOutcome(command.missionOutcome ?? DEFAULT_MISSION_OUTCOME);
  if (!missionOutcome.ok) return missionOutcome;
  const activityLabels = normalizeActivityLabels(command.activityLabels ?? DEFAULT_ACTIVITY_LABELS);
  if (!activityLabels.ok) return activityLabels;

  return success({
    name: name.value,
    description: description.value,
    expectedOutcome: expectedOutcome.value,
    status: status.value,
    environment: environment.value,
    repositoryUrl: repositoryUrl.value,
    missionTitle: missionTitle.value,
    missionOutcome: missionOutcome.value,
    activityLabels: activityLabels.value,
  });
}

function buildTemplateTask(
  label: string,
  dependencies: StudioServiceDependencies,
  allocatedIds: Set<string>,
  weight = 1,
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
    weight,
    progress: 0,
    checkpoints: [checkpoint],
    gates,
    blocker: null,
    legacy: null,
  });
}

function buildProject(
  input: NormalizedProjectInput,
  timestamp: string,
  dependencies: StudioServiceDependencies,
  allocatedIds: Set<string>,
): StudioServiceResult<StudioProjectV3> {
  const projectId = allocateId("project", dependencies, allocatedIds);
  if (!projectId.ok) return projectId;

  const missionId = allocateId("mission", dependencies, allocatedIds);
  if (!missionId.ok) return missionId;

  const tasks: StudioTaskV3[] = [];

  for (const taskLabel of input.activityLabels) {
    const task = buildTemplateTask(taskLabel, dependencies, allocatedIds);
    if (!task.ok) return task;
    tasks.push(task.value);
  }

  const mission: StudioMissionV3 = {
    id: missionId.value,
    title: input.missionTitle,
    expectedOutcome: input.missionOutcome,
    tasks,
  };

  return success({
    id: projectId.value,
    name: input.name,
    description: input.description,
    expectedOutcome: input.expectedOutcome,
    status: input.status,
    environment: input.environment,
    repositoryUrl: input.repositoryUrl,
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
  const status = project.status === "completed" && nextTask.value.status !== "done"
    ? "active" as const
    : project.status;
  const projects = state.projects.map((item, index) => (
    index === projectIndex ? { ...project, missions, status, updatedAt: timestamp } : item
  ));

  return success(touchState(state, projects, state.activeProjectId));
}

export function createInitialStudioState(
  dependencies: StudioServiceDependencies,
): StudioServiceResult<StudioStateV3> {
  const input = normalizeCreateProjectCommand({ name: "Vision Smart Studio" });
  if (!input.ok) return input;
  const timestamp = dependencies.now();
  const project = buildProject(
    input.value,
    timestamp,
    dependencies,
    new Set<string>(),
  );
  if (!project.ok) return project;

  return success({
    version: 4,
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
  const input = normalizeCreateProjectCommand(command);
  if (!input.ok) return input;
  if (input.value.status === "completed") {
    return failure(
      "PROJECT_NOT_READY",
      "Un nouveau projet ne peut pas être terminé avant validation de toutes ses activités.",
    );
  }
  const nameKey = comparableLabel(input.value.name);
  if (state.projects.some((project) => comparableLabel(project.name) === nameKey)) {
    return failure("DUPLICATE_PROJECT_NAME", "Un projet portant ce nom existe déjà.");
  }

  const timestamp = dependencies.now();
  const project = buildProject(
    input.value,
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

export function updateProject(
  state: StudioStateV3,
  command: UpdateProjectCommand,
  dependencies: StudioServiceDependencies,
): StudioServiceResult<StudioStateV3> {
  const projectIndex = state.projects.findIndex((project) => project.id === command.projectId);
  if (projectIndex < 0) return failure("PROJECT_NOT_FOUND", "Projet introuvable.");
  if (
    command.name === undefined
    && command.description === undefined
    && command.expectedOutcome === undefined
    && command.status === undefined
    && command.environment === undefined
    && command.repositoryUrl === undefined
  ) {
    return failure("INVALID_PROJECT_UPDATE", "Aucun paramètre de projet n’a été fourni.");
  }

  const project = state.projects[projectIndex];
  let name = project.name;
  let description = project.description;
  let expectedOutcome = project.expectedOutcome;
  let status = project.status;
  let environment = project.environment;
  let repositoryUrl = project.repositoryUrl;

  if (command.name !== undefined) {
    const normalized = normalizeProjectName(command.name);
    if (!normalized.ok) return normalized;
    const nameKey = comparableLabel(normalized.value);
    if (state.projects.some((item, index) => index !== projectIndex && comparableLabel(item.name) === nameKey)) {
      return failure("DUPLICATE_PROJECT_NAME", "Un projet portant ce nom existe déjà.");
    }
    name = normalized.value;
  }
  if (command.description !== undefined) {
    const normalized = normalizeProjectDescription(command.description);
    if (!normalized.ok) return normalized;
    description = normalized.value;
  }
  if (command.expectedOutcome !== undefined) {
    const normalized = normalizeProjectOutcome(command.expectedOutcome);
    if (!normalized.ok) return normalized;
    expectedOutcome = normalized.value;
  }
  if (command.status !== undefined) {
    const normalized = normalizeProjectStatus(command.status);
    if (!normalized.ok) return normalized;
    status = normalized.value;
  }
  if (command.environment !== undefined) {
    const normalized = normalizeProjectEnvironment(command.environment);
    if (!normalized.ok) return normalized;
    environment = normalized.value;
  }
  if (command.repositoryUrl !== undefined) {
    const normalized = normalizeRepositoryUrl(command.repositoryUrl);
    if (!normalized.ok) return normalized;
    repositoryUrl = normalized.value;
  }

  const candidate: StudioProjectV3 = {
    ...project,
    name,
    description,
    expectedOutcome,
    status,
    environment,
    repositoryUrl,
  };
  if (candidate.status === "completed" && projectProgress(candidate) !== 100) {
    return failure(
      "PROJECT_NOT_READY",
      "Le projet ne peut être terminé tant que toutes ses activités ne sont pas validées.",
    );
  }
  if (
    candidate.name === project.name
    && candidate.description === project.description
    && candidate.expectedOutcome === project.expectedOutcome
    && candidate.status === project.status
    && candidate.environment === project.environment
    && candidate.repositoryUrl === project.repositoryUrl
  ) {
    return success(state);
  }

  const timestamp = dependencies.now();
  const projects = state.projects.map((item, index) => (
    index === projectIndex ? { ...candidate, updatedAt: timestamp } : item
  ));
  return success(touchState(state, projects, state.activeProjectId));
}

export function createMission(
  state: StudioStateV3,
  command: CreateMissionCommand,
  dependencies: StudioServiceDependencies,
): StudioServiceResult<StudioStateV3> {
  const title = normalizeMissionTitle(command.title);
  if (!title.ok) return title;
  const expectedOutcome = normalizeMissionOutcome(command.expectedOutcome);
  if (!expectedOutcome.ok) return expectedOutcome;

  const projectIndex = state.projects.findIndex((project) => project.id === command.projectId);
  if (projectIndex < 0) return failure("PROJECT_NOT_FOUND", "Projet introuvable.");
  const project = state.projects[projectIndex];
  if (project.status === "completed") {
    return failure("PROJECT_COMPLETED", "Réactive le projet avant d’ajouter une mission.");
  }
  if (project.missions.length >= MAX_MISSIONS_PER_PROJECT) {
    return failure(
      "TOO_MANY_MISSIONS",
      `Le projet ne peut pas contenir plus de ${MAX_MISSIONS_PER_PROJECT} missions.`,
    );
  }
  const titleKey = comparableLabel(title.value);
  if (project.missions.some((mission) => comparableLabel(mission.title) === titleKey)) {
    return failure("DUPLICATE_MISSION_TITLE", "Une mission portant ce titre existe déjà dans le projet.");
  }

  const allocatedIds = collectEntityIds(state);
  const missionId = allocateId("mission", dependencies, allocatedIds);
  if (!missionId.ok) return missionId;
  const timestamp = dependencies.now();
  const mission: StudioMissionV3 = {
    id: missionId.value,
    title: title.value,
    expectedOutcome: expectedOutcome.value,
    tasks: [],
  };
  const projects = state.projects.map((item, index) => (
    index === projectIndex
      ? {
          ...project,
          updatedAt: timestamp,
          activeMissionId: mission.id,
          missions: [...project.missions, mission],
        }
      : item
  ));
  return success(touchState(state, projects, project.id));
}

export function createTask(
  state: StudioStateV3,
  command: CreateTaskCommand,
  dependencies: StudioServiceDependencies,
): StudioServiceResult<StudioStateV3> {
  const label = normalizeActivityLabel(command.label);
  if (!label.ok) return label;
  const weight = command.weight ?? 1;
  if (!Number.isFinite(weight) || weight <= 0 || weight > MAX_TASK_WEIGHT) {
    return failure(
      "INVALID_TASK_WEIGHT",
      `Le poids de l’activité doit être fini, strictement positif et inférieur ou égal à ${MAX_TASK_WEIGHT}.`,
    );
  }

  const projectIndex = state.projects.findIndex((project) => project.id === command.projectId);
  if (projectIndex < 0) return failure("PROJECT_NOT_FOUND", "Projet introuvable.");
  const project = state.projects[projectIndex];
  if (project.status === "completed") {
    return failure("PROJECT_COMPLETED", "Réactive le projet avant d’ajouter une activité.");
  }
  const missionIndex = project.missions.findIndex((mission) => mission.id === command.missionId);
  if (missionIndex < 0) return failure("MISSION_NOT_FOUND", "Mission introuvable dans ce projet.");
  const mission = project.missions[missionIndex];
  if (mission.tasks.length >= MAX_TASKS_PER_MISSION) {
    return failure(
      "TOO_MANY_ACTIVITIES",
      `Une mission ne peut pas contenir plus de ${MAX_TASKS_PER_MISSION} activités.`,
    );
  }
  const labelKey = comparableLabel(label.value);
  if (mission.tasks.some((task) => comparableLabel(task.label) === labelKey)) {
    return failure("DUPLICATE_ACTIVITY_LABEL", "Une activité portant ce libellé existe déjà dans la mission.");
  }

  const task = buildTemplateTask(label.value, dependencies, collectEntityIds(state), weight);
  if (!task.ok) return task;
  const timestamp = dependencies.now();
  const missions = project.missions.map((item, index) => (
    index === missionIndex ? { ...mission, tasks: [...mission.tasks, task.value] } : item
  ));
  const projects = state.projects.map((item, index) => (
    index === projectIndex
      ? { ...project, missions, activeMissionId: mission.id, updatedAt: timestamp }
      : item
  ));
  return success(touchState(state, projects, project.id));
}

/** User-facing activities are canonical tasks. */
export const createActivity = createTask;

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
  if (!GATE_STATUSES.includes(command.status)) {
    return failure("INVALID_GATE_RESULT", "Le statut du gate de validation est inconnu.");
  }
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
        MAX_GATE_EVIDENCE_LENGTH,
        "INVALID_GATE_RESULT",
        "Une preuve est obligatoire pour valider un gate.",
      );
      if (!normalizedEvidence.ok) return normalizedEvidence;
      evidence = normalizedEvidence.value;
    } else if (command.status === "failed" || command.status === "not_applicable") {
      const normalizedReason = normalizeRequiredText(
        command.reason,
        MAX_GATE_REASON_LENGTH,
        "INVALID_GATE_RESULT",
        "Une raison est obligatoire pour un gate échoué ou non applicable.",
      );
      if (!normalizedReason.ok) return normalizedReason;
      reason = normalizedReason.value;
      const optionalEvidence = normalizeOptionalText(
        command.evidence,
        MAX_GATE_EVIDENCE_LENGTH,
      );
      if (!optionalEvidence.ok) return optionalEvidence;
      evidence = optionalEvidence.value;
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
