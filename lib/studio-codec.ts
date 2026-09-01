import { canMarkTaskDone, taskProgress } from "./studio-progress";
import type {
  GateStatus,
  StudioBlocker,
  StudioCheckpoint,
  StudioLegacyTaskState,
  StudioMissionV3,
  StudioProjectV3,
  StudioStateV3,
  StudioTaskV3,
  StudioValidationGate,
  TaskStatus,
} from "./studio-types";

const TASK_STATUSES: readonly TaskStatus[] = ["todo", "in_progress", "done", "blocked"];
const GATE_STATUSES: readonly GateStatus[] = ["pending", "passed", "failed", "not_applicable"];

export type StudioCodecIssue = {
  path: string;
  code: string;
  message: string;
};

export type StudioMigrationWarning = {
  path: string;
  code: string;
  message: string;
};

export type DecodeStudioStateResult =
  | {
      ok: true;
      state: StudioStateV3;
      migrated: boolean;
      sourceVersion: 1 | 2 | 3;
      warnings: StudioMigrationWarning[];
    }
  | {
      ok: false;
      kind: "invalid_json" | "invalid_state";
      issues: StudioCodecIssue[];
    }
  | {
      ok: false;
      kind: "unsupported_version";
      version: number;
      issues: StudioCodecIssue[];
    };

export type EncodeStudioStateResult =
  | { ok: true; json: string }
  | { ok: false; issues: StudioCodecIssue[] };

export type DecodeStudioStateOptions = {
  now?: () => string;
};

type LegacyTask = {
  id: string;
  label: string;
  status: TaskStatus;
  progress: number;
};

type LegacyMission = {
  id: string;
  title: string;
  expectedOutcome: string;
  tasks: LegacyTask[];
};

type LegacyProjectV1 = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  tasks: LegacyTask[];
};

type LegacyProjectV2 = Omit<LegacyProjectV1, "tasks"> & {
  missions: LegacyMission[];
};

type LegacyStateV1 = {
  activeProjectId: string | null;
  projects: LegacyProjectV1[];
};

type LegacyStateV2 = {
  activeProjectId: string | null;
  projects: LegacyProjectV2[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function issue(issues: StudioCodecIssue[], path: string, code: string, message: string): void {
  issues.push({ path, code, message });
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  issues: StudioCodecIssue[],
): void {
  const allowedKeys = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      issue(issues, `${path}.${key}`, "unknown_field", `Le champ ${key} n'appartient pas au schéma.`);
    }
  }
}

function readString(
  value: Record<string, unknown>,
  key: string,
  path: string,
  issues: StudioCodecIssue[],
): string {
  const candidate = value[key];
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    issue(issues, `${path}.${key}`, "invalid_string", "Une chaîne non vide est requise.");
    return "";
  }
  return candidate;
}

function readNullableString(
  value: Record<string, unknown>,
  key: string,
  path: string,
  issues: StudioCodecIssue[],
): string | null {
  const candidate = value[key];
  if (candidate === null) return null;
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    issue(issues, `${path}.${key}`, "invalid_nullable_string", "Une chaîne non vide ou null est requis.");
    return null;
  }
  return candidate;
}

function readBoolean(
  value: Record<string, unknown>,
  key: string,
  path: string,
  issues: StudioCodecIssue[],
): boolean {
  const candidate = value[key];
  if (typeof candidate !== "boolean") {
    issue(issues, `${path}.${key}`, "invalid_boolean", "Un booléen est requis.");
    return false;
  }
  return candidate;
}

function readInteger(
  value: Record<string, unknown>,
  key: string,
  path: string,
  issues: StudioCodecIssue[],
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  const candidate = value[key];
  if (typeof candidate !== "number" || !Number.isInteger(candidate) || candidate < minimum || candidate > maximum) {
    issue(issues, `${path}.${key}`, "invalid_integer", `Un entier entre ${minimum} et ${maximum} est requis.`);
    return minimum;
  }
  return candidate;
}

function readPositiveNumber(
  value: Record<string, unknown>,
  key: string,
  path: string,
  issues: StudioCodecIssue[],
): number {
  const candidate = value[key];
  if (typeof candidate !== "number" || !Number.isFinite(candidate) || candidate <= 0) {
    issue(issues, `${path}.${key}`, "invalid_weight", "Un poids fini strictement positif est requis.");
    return 1;
  }
  return candidate;
}

function readArray(
  value: Record<string, unknown>,
  key: string,
  path: string,
  issues: StudioCodecIssue[],
): unknown[] {
  const candidate = value[key];
  if (!Array.isArray(candidate)) {
    issue(issues, `${path}.${key}`, "invalid_array", "Un tableau est requis.");
    return [];
  }
  return candidate;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) && Number.isFinite(Date.parse(value));
}

function validateIsoDate(value: string, path: string, issues: StudioCodecIssue[]): void {
  if (!isIsoDate(value)) {
    issue(issues, path, "invalid_timestamp", "Une date ISO UTC valide est requise.");
  }
}

function ensureUniqueIds(items: readonly { id: string }[], path: string, issues: StudioCodecIssue[]): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.id)) {
      issue(issues, `${path}[${index}].id`, "duplicate_id", `L'identifiant ${item.id} est dupliqué.`);
    }
    seen.add(item.id);
  });
}

function readTaskStatus(
  value: Record<string, unknown>,
  key: string,
  path: string,
  issues: StudioCodecIssue[],
): TaskStatus {
  const candidate = value[key];
  if (typeof candidate !== "string" || !TASK_STATUSES.includes(candidate as TaskStatus)) {
    issue(issues, `${path}.${key}`, "invalid_task_status", "Le statut de tâche est inconnu.");
    return "todo";
  }
  return candidate as TaskStatus;
}

function readGateStatus(
  value: Record<string, unknown>,
  key: string,
  path: string,
  issues: StudioCodecIssue[],
): GateStatus {
  const candidate = value[key];
  if (typeof candidate !== "string" || !GATE_STATUSES.includes(candidate as GateStatus)) {
    issue(issues, `${path}.${key}`, "invalid_gate_status", "Le statut de gate est inconnu.");
    return "pending";
  }
  return candidate as GateStatus;
}

function parseLegacyTask(input: unknown, path: string, issues: StudioCodecIssue[]): LegacyTask {
  if (!isRecord(input)) {
    issue(issues, path, "invalid_object", "Une tâche est requise.");
    return { id: "", label: "", status: "todo", progress: 0 };
  }
  rejectUnknownKeys(input, ["id", "label", "status", "progress"], path, issues);
  return {
    id: readString(input, "id", path, issues),
    label: readString(input, "label", path, issues),
    status: readTaskStatus(input, "status", path, issues),
    progress: readInteger(input, "progress", path, issues, 0, 100),
  };
}

function parseLegacyMission(input: unknown, path: string, issues: StudioCodecIssue[]): LegacyMission {
  if (!isRecord(input)) {
    issue(issues, path, "invalid_object", "Une mission est requise.");
    return { id: "", title: "", expectedOutcome: "", tasks: [] };
  }
  rejectUnknownKeys(input, ["id", "title", "expectedOutcome", "tasks"], path, issues);
  const tasks = readArray(input, "tasks", path, issues).map((task, index) =>
    parseLegacyTask(task, `${path}.tasks[${index}]`, issues),
  );
  ensureUniqueIds(tasks, `${path}.tasks`, issues);
  return {
    id: readString(input, "id", path, issues),
    title: readString(input, "title", path, issues),
    expectedOutcome: readString(input, "expectedOutcome", path, issues),
    tasks,
  };
}

function parseLegacyProjectV1(input: unknown, path: string, issues: StudioCodecIssue[]): LegacyProjectV1 {
  if (!isRecord(input)) {
    issue(issues, path, "invalid_object", "Un projet est requis.");
    return { id: "", name: "", description: "", createdAt: "", updatedAt: "", tasks: [] };
  }
  rejectUnknownKeys(input, ["id", "name", "description", "createdAt", "updatedAt", "tasks"], path, issues);
  const createdAt = readString(input, "createdAt", path, issues);
  const updatedAt = readString(input, "updatedAt", path, issues);
  validateIsoDate(createdAt, `${path}.createdAt`, issues);
  validateIsoDate(updatedAt, `${path}.updatedAt`, issues);
  if (isIsoDate(createdAt) && isIsoDate(updatedAt) && Date.parse(updatedAt) < Date.parse(createdAt)) {
    issue(issues, `${path}.updatedAt`, "timestamp_order", "updatedAt ne peut pas précéder createdAt.");
  }
  const tasks = readArray(input, "tasks", path, issues).map((task, index) =>
    parseLegacyTask(task, `${path}.tasks[${index}]`, issues),
  );
  ensureUniqueIds(tasks, `${path}.tasks`, issues);
  return {
    id: readString(input, "id", path, issues),
    name: readString(input, "name", path, issues),
    description: readString(input, "description", path, issues),
    createdAt,
    updatedAt,
    tasks,
  };
}

function parseLegacyProjectV2(input: unknown, path: string, issues: StudioCodecIssue[]): LegacyProjectV2 {
  if (!isRecord(input)) {
    issue(issues, path, "invalid_object", "Un projet est requis.");
    return { id: "", name: "", description: "", createdAt: "", updatedAt: "", missions: [] };
  }
  rejectUnknownKeys(input, ["id", "name", "description", "createdAt", "updatedAt", "missions"], path, issues);
  const createdAt = readString(input, "createdAt", path, issues);
  const updatedAt = readString(input, "updatedAt", path, issues);
  validateIsoDate(createdAt, `${path}.createdAt`, issues);
  validateIsoDate(updatedAt, `${path}.updatedAt`, issues);
  if (isIsoDate(createdAt) && isIsoDate(updatedAt) && Date.parse(updatedAt) < Date.parse(createdAt)) {
    issue(issues, `${path}.updatedAt`, "timestamp_order", "updatedAt ne peut pas précéder createdAt.");
  }
  const missions = readArray(input, "missions", path, issues).map((mission, index) =>
    parseLegacyMission(mission, `${path}.missions[${index}]`, issues),
  );
  ensureUniqueIds(missions, `${path}.missions`, issues);
  return {
    id: readString(input, "id", path, issues),
    name: readString(input, "name", path, issues),
    description: readString(input, "description", path, issues),
    createdAt,
    updatedAt,
    missions,
  };
}

function readLegacyActiveProjectId(
  input: Record<string, unknown>,
  path: string,
  issues: StudioCodecIssue[],
): string | null {
  if (!("activeProjectId" in input) || input.activeProjectId === null || input.activeProjectId === undefined) {
    return null;
  }
  return readString(input, "activeProjectId", path, issues);
}

function parseLegacyStateV1(input: Record<string, unknown>, issues: StudioCodecIssue[]): LegacyStateV1 {
  rejectUnknownKeys(input, ["version", "activeProjectId", "projects"], "$", issues);
  if ("version" in input && input.version !== 1) {
    issue(issues, "$.version", "invalid_version", "La version legacy attendue est 1.");
  }
  const projects = readArray(input, "projects", "$", issues).map((project, index) =>
    parseLegacyProjectV1(project, `$.projects[${index}]`, issues),
  );
  ensureUniqueIds(projects, "$.projects", issues);
  return { activeProjectId: readLegacyActiveProjectId(input, "$", issues), projects };
}

function parseLegacyStateV2(input: Record<string, unknown>, issues: StudioCodecIssue[]): LegacyStateV2 {
  rejectUnknownKeys(input, ["version", "activeProjectId", "projects"], "$", issues);
  if (input.version !== 2) {
    issue(issues, "$.version", "invalid_version", "La version attendue est 2.");
  }
  const projects = readArray(input, "projects", "$", issues).map((project, index) =>
    parseLegacyProjectV2(project, `$.projects[${index}]`, issues),
  );
  ensureUniqueIds(projects, "$.projects", issues);
  return { activeProjectId: readLegacyActiveProjectId(input, "$", issues), projects };
}

function parseCheckpoint(input: unknown, path: string, issues: StudioCodecIssue[]): StudioCheckpoint {
  if (!isRecord(input)) {
    issue(issues, path, "invalid_object", "Un checkpoint est requis.");
    return { id: "", label: "", weight: 1, verified: false, verifiedAt: null };
  }
  rejectUnknownKeys(input, ["id", "label", "weight", "verified", "verifiedAt"], path, issues);
  const verified = readBoolean(input, "verified", path, issues);
  const verifiedAt = readNullableString(input, "verifiedAt", path, issues);
  if (verified && verifiedAt === null) {
    issue(issues, `${path}.verifiedAt`, "missing_verification_time", "Un checkpoint vérifié doit être horodaté.");
  }
  if (!verified && verifiedAt !== null) {
    issue(issues, `${path}.verifiedAt`, "unexpected_verification_time", "Un checkpoint non vérifié ne doit pas être horodaté.");
  }
  if (verifiedAt !== null) validateIsoDate(verifiedAt, `${path}.verifiedAt`, issues);
  return {
    id: readString(input, "id", path, issues),
    label: readString(input, "label", path, issues),
    weight: readPositiveNumber(input, "weight", path, issues),
    verified,
    verifiedAt,
  };
}

function parseGate(input: unknown, path: string, issues: StudioCodecIssue[]): StudioValidationGate {
  if (!isRecord(input)) {
    issue(issues, path, "invalid_object", "Une gate est requise.");
    return {
      id: "",
      label: "",
      required: true,
      status: "pending",
      checkedAt: null,
      evidence: null,
      reason: null,
    };
  }
  rejectUnknownKeys(input, ["id", "label", "required", "status", "checkedAt", "evidence", "reason"], path, issues);
  const status = readGateStatus(input, "status", path, issues);
  const checkedAt = readNullableString(input, "checkedAt", path, issues);
  const evidence = readNullableString(input, "evidence", path, issues);
  const reason = readNullableString(input, "reason", path, issues);
  if (checkedAt !== null) validateIsoDate(checkedAt, `${path}.checkedAt`, issues);

  if (status === "pending" && (checkedAt !== null || evidence !== null || reason !== null)) {
    issue(issues, path, "pending_gate_has_result", "Une gate pending ne porte ni résultat, ni preuve, ni raison.");
  }
  if (status === "passed" && (checkedAt === null || evidence === null || reason !== null)) {
    issue(issues, path, "invalid_passed_gate", "Une gate passée exige un horodatage et une preuve, sans raison d'échec.");
  }
  if (status === "failed" && (checkedAt === null || reason === null)) {
    issue(issues, path, "invalid_failed_gate", "Une gate échouée exige un horodatage et une raison.");
  }
  if (status === "not_applicable" && (checkedAt === null || reason === null)) {
    issue(issues, path, "invalid_not_applicable_gate", "Une gate non applicable exige un horodatage et une raison.");
  }

  return {
    id: readString(input, "id", path, issues),
    label: readString(input, "label", path, issues),
    required: readBoolean(input, "required", path, issues),
    status,
    checkedAt,
    evidence,
    reason,
  };
}

function parseBlocker(input: unknown, path: string, issues: StudioCodecIssue[]): StudioBlocker | null {
  if (input === null) return null;
  if (!isRecord(input)) {
    issue(issues, path, "invalid_blocker", "Un blocker structuré ou null est requis.");
    return null;
  }
  rejectUnknownKeys(input, ["reason", "requiredAction", "resumeCondition", "blockedAt"], path, issues);
  const blockedAt = readString(input, "blockedAt", path, issues);
  validateIsoDate(blockedAt, `${path}.blockedAt`, issues);
  return {
    reason: readString(input, "reason", path, issues),
    requiredAction: readString(input, "requiredAction", path, issues),
    resumeCondition: readString(input, "resumeCondition", path, issues),
    blockedAt,
  };
}

function parseLegacyProvenance(
  input: unknown,
  path: string,
  issues: StudioCodecIssue[],
): StudioLegacyTaskState | null {
  if (input === null) return null;
  if (!isRecord(input)) {
    issue(issues, path, "invalid_legacy_provenance", "Une provenance legacy structurée ou null est requise.");
    return null;
  }
  rejectUnknownKeys(input, ["reportedStatus", "reportedProgress"], path, issues);
  return {
    reportedStatus: readTaskStatus(input, "reportedStatus", path, issues),
    reportedProgress: readInteger(input, "reportedProgress", path, issues, 0, 100),
  };
}

function parseTaskV3(input: unknown, path: string, issues: StudioCodecIssue[]): StudioTaskV3 {
  if (!isRecord(input)) {
    issue(issues, path, "invalid_object", "Une tâche v3 est requise.");
    return {
      id: "",
      label: "",
      status: "todo",
      weight: 1,
      progress: 0,
      checkpoints: [],
      gates: [],
      blocker: null,
      legacy: null,
    };
  }
  rejectUnknownKeys(
    input,
    ["id", "label", "status", "weight", "progress", "checkpoints", "gates", "blocker", "legacy"],
    path,
    issues,
  );
  const checkpoints = readArray(input, "checkpoints", path, issues).map((checkpoint, index) =>
    parseCheckpoint(checkpoint, `${path}.checkpoints[${index}]`, issues),
  );
  const gates = readArray(input, "gates", path, issues).map((gate, index) =>
    parseGate(gate, `${path}.gates[${index}]`, issues),
  );
  ensureUniqueIds(checkpoints, `${path}.checkpoints`, issues);
  ensureUniqueIds(gates, `${path}.gates`, issues);
  if (!gates.some((gate) => gate.required)) {
    issue(issues, `${path}.gates`, "missing_required_gate", "Une tâche doit avoir au moins une gate requise.");
  }
  const task: StudioTaskV3 = {
    id: readString(input, "id", path, issues),
    label: readString(input, "label", path, issues),
    status: readTaskStatus(input, "status", path, issues),
    weight: readPositiveNumber(input, "weight", path, issues),
    progress: readInteger(input, "progress", path, issues, 0, 100),
    checkpoints,
    gates,
    blocker: parseBlocker(input.blocker, `${path}.blocker`, issues),
    legacy: parseLegacyProvenance(input.legacy, `${path}.legacy`, issues),
  };
  const derivedProgress = taskProgress(task);
  if (task.progress !== derivedProgress) {
    issue(
      issues,
      `${path}.progress`,
      "stale_derived_progress",
      `La progression persistée ${task.progress} ne correspond pas à la valeur dérivée ${derivedProgress}.`,
    );
  }
  if (task.status === "todo" && task.progress !== 0) {
    issue(issues, `${path}.status`, "invalid_todo_progress", "Une tâche todo doit être à 0 %.");
  }
  if (task.status === "blocked" && task.blocker === null) {
    issue(issues, `${path}.blocker`, "missing_blocker", "Une tâche bloquée exige un blocker traçable.");
  }
  if (task.status !== "blocked" && task.blocker !== null) {
    issue(issues, `${path}.status`, "unexpected_blocker", "Une tâche portant un blocker doit avoir le statut blocked.");
  }
  if (task.status === "done" && !canMarkTaskDone(task)) {
    issue(issues, `${path}.status`, "invalid_done_task", "Une tâche done exige 100 %, toutes les gates requises et aucun blocker.");
  }
  return task;
}

function parseMissionV3(input: unknown, path: string, issues: StudioCodecIssue[]): StudioMissionV3 {
  if (!isRecord(input)) {
    issue(issues, path, "invalid_object", "Une mission v3 est requise.");
    return { id: "", title: "", expectedOutcome: "", tasks: [] };
  }
  rejectUnknownKeys(input, ["id", "title", "expectedOutcome", "tasks"], path, issues);
  const tasks = readArray(input, "tasks", path, issues).map((task, index) =>
    parseTaskV3(task, `${path}.tasks[${index}]`, issues),
  );
  ensureUniqueIds(tasks, `${path}.tasks`, issues);
  return {
    id: readString(input, "id", path, issues),
    title: readString(input, "title", path, issues),
    expectedOutcome: readString(input, "expectedOutcome", path, issues),
    tasks,
  };
}

function parseProjectV3(input: unknown, path: string, issues: StudioCodecIssue[]): StudioProjectV3 {
  if (!isRecord(input)) {
    issue(issues, path, "invalid_object", "Un projet v3 est requis.");
    return {
      id: "",
      name: "",
      description: "",
      createdAt: "",
      updatedAt: "",
      activeMissionId: null,
      missions: [],
    };
  }
  rejectUnknownKeys(
    input,
    ["id", "name", "description", "createdAt", "updatedAt", "activeMissionId", "missions"],
    path,
    issues,
  );
  const createdAt = readString(input, "createdAt", path, issues);
  const updatedAt = readString(input, "updatedAt", path, issues);
  validateIsoDate(createdAt, `${path}.createdAt`, issues);
  validateIsoDate(updatedAt, `${path}.updatedAt`, issues);
  if (isIsoDate(createdAt) && isIsoDate(updatedAt) && Date.parse(updatedAt) < Date.parse(createdAt)) {
    issue(issues, `${path}.updatedAt`, "timestamp_order", "updatedAt ne peut pas précéder createdAt.");
  }
  const missions = readArray(input, "missions", path, issues).map((mission, index) =>
    parseMissionV3(mission, `${path}.missions[${index}]`, issues),
  );
  ensureUniqueIds(missions, `${path}.missions`, issues);
  const activeMissionId = readNullableString(input, "activeMissionId", path, issues);
  if (activeMissionId !== null && !missions.some((mission) => mission.id === activeMissionId)) {
    issue(issues, `${path}.activeMissionId`, "dangling_active_mission", "La mission active n'existe pas dans le projet.");
  }
  return {
    id: readString(input, "id", path, issues),
    name: readString(input, "name", path, issues),
    description: readString(input, "description", path, issues),
    createdAt,
    updatedAt,
    activeMissionId,
    missions,
  };
}

function parseStateV3(input: unknown, issues: StudioCodecIssue[]): StudioStateV3 | null {
  if (!isRecord(input)) {
    issue(issues, "$", "invalid_object", "La racine du snapshot doit être un objet.");
    return null;
  }
  rejectUnknownKeys(input, ["version", "revision", "savedAt", "activeProjectId", "projects"], "$", issues);
  if (input.version !== 3) {
    issue(issues, "$.version", "invalid_version", "La version attendue est 3.");
  }
  const savedAt = readString(input, "savedAt", "$", issues);
  validateIsoDate(savedAt, "$.savedAt", issues);
  const projects = readArray(input, "projects", "$", issues).map((project, index) =>
    parseProjectV3(project, `$.projects[${index}]`, issues),
  );
  ensureUniqueIds(projects, "$.projects", issues);
  const activeProjectId = readNullableString(input, "activeProjectId", "$", issues);
  if (activeProjectId !== null && !projects.some((project) => project.id === activeProjectId)) {
    issue(issues, "$.activeProjectId", "dangling_active_project", "Le projet actif n'existe pas.");
  }
  return {
    version: 3,
    revision: readInteger(input, "revision", "$", issues, 0),
    savedAt,
    activeProjectId,
    projects,
  };
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

function migrateLegacyTask(
  task: LegacyTask,
  path: string,
  warnings: StudioMigrationWarning[],
): StudioTaskV3 {
  warnings.push({
    path,
    code: "legacy_task_requires_verification",
    message: "Le statut et le pourcentage historiques sont conservés comme provenance, sans être déclarés validés.",
  });
  if (task.status === "blocked") {
    warnings.push({
      path: `${path}.status`,
      code: "legacy_blocker_requires_details",
      message: "Le blocage historique est rouvert car il ne contient ni raison, ni action, ni condition de reprise.",
    });
  }
  return {
    id: task.id,
    label: task.label,
    status: task.status === "todo" && task.progress === 0 ? "todo" : "in_progress",
    weight: 1,
    progress: 0,
    checkpoints: [
      {
        id: "legacy-state",
        label: "État historique à vérifier",
        weight: 1,
        verified: false,
        verifiedAt: null,
      },
    ],
    gates: [
      pendingGate("quality", "Qualité"),
      pendingGate("security", "Sécurité"),
      pendingGate("documentation", "Documentation"),
    ],
    blocker: null,
    legacy: {
      reportedStatus: task.status,
      reportedProgress: task.progress,
    },
  };
}

function repairedActiveProjectId(
  requestedId: string | null,
  projects: readonly StudioProjectV3[],
  warnings: StudioMigrationWarning[],
): string | null {
  if (requestedId !== null && projects.some((project) => project.id === requestedId)) return requestedId;
  const repaired = projects[0]?.id ?? null;
  if (requestedId !== repaired) {
    warnings.push({
      path: "$.activeProjectId",
      code: "active_project_repaired",
      message: "La référence active legacy a été explicitement remplacée par le premier projet disponible.",
    });
  }
  return repaired;
}

function migrateV1(state: LegacyStateV1, savedAt: string, warnings: StudioMigrationWarning[]): StudioStateV3 {
  const projects = state.projects.map((project, projectIndex): StudioProjectV3 => {
    const mission: StudioMissionV3 = {
      id: `${project.id}-mission-1`,
      title: "Mission principale",
      expectedOutcome: "Livrer le résultat attendu du projet.",
      tasks: project.tasks.map((task, taskIndex) =>
        migrateLegacyTask(task, `$.projects[${projectIndex}].tasks[${taskIndex}]`, warnings),
      ),
    };
    warnings.push({
      path: `$.projects[${projectIndex}].activeMissionId`,
      code: "active_mission_selected",
      message: "La première mission migrée a été explicitement sélectionnée.",
    });
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      activeMissionId: mission.id,
      missions: [mission],
    };
  });
  return {
    version: 3,
    revision: 0,
    savedAt,
    activeProjectId: repairedActiveProjectId(state.activeProjectId, projects, warnings),
    projects,
  };
}

function migrateV2(state: LegacyStateV2, savedAt: string, warnings: StudioMigrationWarning[]): StudioStateV3 {
  const projects = state.projects.map((project, projectIndex): StudioProjectV3 => {
    const missions = project.missions.map((mission, missionIndex): StudioMissionV3 => ({
      id: mission.id,
      title: mission.title,
      expectedOutcome: mission.expectedOutcome,
      tasks: mission.tasks.map((task, taskIndex) =>
        migrateLegacyTask(
          task,
          `$.projects[${projectIndex}].missions[${missionIndex}].tasks[${taskIndex}]`,
          warnings,
        ),
      ),
    }));
    const activeMissionId = missions[0]?.id ?? null;
    if (activeMissionId !== null) {
      warnings.push({
        path: `$.projects[${projectIndex}].activeMissionId`,
        code: "active_mission_selected",
        message: "La première mission legacy a été explicitement sélectionnée.",
      });
    }
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      activeMissionId,
      missions,
    };
  });
  return {
    version: 3,
    revision: 0,
    savedAt,
    activeProjectId: repairedActiveProjectId(state.activeProjectId, projects, warnings),
    projects,
  };
}

function invalidState(issues: StudioCodecIssue[]): DecodeStudioStateResult {
  return { ok: false, kind: "invalid_state", issues };
}

export function decodeStudioState(
  input: unknown,
  options: DecodeStudioStateOptions = {},
): DecodeStudioStateResult {
  let parsed: unknown = input;
  if (typeof input === "string") {
    try {
      parsed = JSON.parse(input) as unknown;
    } catch {
      return {
        ok: false,
        kind: "invalid_json",
        issues: [{ path: "$", code: "invalid_json", message: "Le contenu stocké n'est pas un JSON valide." }],
      };
    }
  }
  if (!isRecord(parsed)) {
    return invalidState([{ path: "$", code: "invalid_object", message: "La racine doit être un objet." }]);
  }

  const rawVersion = parsed.version;
  if (typeof rawVersion === "number" && Number.isInteger(rawVersion) && rawVersion > 3) {
    return {
      ok: false,
      kind: "unsupported_version",
      version: rawVersion,
      issues: [{ path: "$.version", code: "future_version", message: `La version ${rawVersion} n'est pas supportée.` }],
    };
  }

  if (rawVersion === 3) {
    const issues: StudioCodecIssue[] = [];
    const state = parseStateV3(parsed, issues);
    if (state === null || issues.length > 0) return invalidState(issues);
    return { ok: true, state, migrated: false, sourceVersion: 3, warnings: [] };
  }

  const savedAt = options.now?.() ?? new Date().toISOString();
  const issues: StudioCodecIssue[] = [];
  const warnings: StudioMigrationWarning[] = [];
  let state: StudioStateV3;
  let sourceVersion: 1 | 2;

  if (rawVersion === undefined || rawVersion === 1) {
    sourceVersion = 1;
    state = migrateV1(parseLegacyStateV1(parsed, issues), savedAt, warnings);
  } else if (rawVersion === 2) {
    sourceVersion = 2;
    state = migrateV2(parseLegacyStateV2(parsed, issues), savedAt, warnings);
  } else {
    issue(issues, "$.version", "invalid_version", "La version doit être 1, 2 ou 3.");
    return invalidState(issues);
  }

  if (issues.length > 0) return invalidState(issues);
  const migratedIssues: StudioCodecIssue[] = [];
  const validatedState = parseStateV3(state, migratedIssues);
  if (validatedState === null || migratedIssues.length > 0) return invalidState(migratedIssues);
  return { ok: true, state: validatedState, migrated: true, sourceVersion, warnings };
}

export function encodeStudioState(state: StudioStateV3): EncodeStudioStateResult {
  const issues: StudioCodecIssue[] = [];
  const validatedState = parseStateV3(state, issues);
  if (validatedState === null || issues.length > 0) return { ok: false, issues };
  return { ok: true, json: JSON.stringify(validatedState) };
}
