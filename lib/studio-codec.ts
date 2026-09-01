import { canMarkTaskDone, projectProgress, taskProgress } from "./studio-progress";
import {
  MAX_BLOCKER_FIELD_LENGTH,
  MAX_ENTITY_ID_LENGTH,
  MAX_GATE_EVIDENCE_LENGTH,
  MAX_GATE_REASON_LENGTH,
  MAX_MISSIONS_PER_PROJECT,
  MAX_MISSION_OUTCOME_LENGTH,
  MAX_MISSION_TITLE_LENGTH,
  MAX_PROJECT_DESCRIPTION_LENGTH,
  MAX_PROJECT_NAME_LENGTH,
  MAX_PROJECT_OUTCOME_LENGTH,
  MAX_REPOSITORY_URL_LENGTH,
  MAX_TASK_LABEL_LENGTH,
  MAX_TASKS_PER_MISSION,
  MAX_TASK_WEIGHT,
} from "./studio-service";
import {
  MANDATORY_VALIDATION_GATE_LABELS,
  type GateStatus,
  type ProjectEnvironment,
  type ProjectStatus,
  type StudioBlocker,
  type StudioCheckpoint,
  type StudioLegacyTaskState,
  type StudioMissionV3,
  type StudioProjectV3,
  type StudioStateV3,
  type StudioTaskV3,
  type StudioValidationGate,
  type TaskStatus,
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
      sourceVersion: 1 | 2 | 3 | 4;
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

type LegacyProjectV3 = Omit<
  StudioProjectV3,
  "expectedOutcome" | "status" | "environment" | "repositoryUrl"
>;

type LegacyStateV3 = Omit<StudioStateV3, "version" | "projects"> & {
  version: 3;
  projects: LegacyProjectV3[];
};

const PROJECT_STATUSES: readonly ProjectStatus[] = ["draft", "active", "paused", "completed"];
const PROJECT_ENVIRONMENTS: readonly ProjectEnvironment[] = ["development", "staging", "production"];

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

function readBoundedString(
  value: Record<string, unknown>,
  key: string,
  path: string,
  issues: StudioCodecIssue[],
  maximumLength: number,
): string {
  const candidate = readString(value, key, path, issues);
  if (Array.from(candidate).length > maximumLength) {
    issue(
      issues,
      `${path}.${key}`,
      "string_too_long",
      `La chaîne ne doit pas dépasser ${maximumLength} caractères.`,
    );
  }
  if (/[\u0000-\u001F\u007F]/u.test(candidate)) {
    issue(issues, `${path}.${key}`, "control_character", "Les caractères de contrôle sont interdits.");
  }
  return candidate;
}

function readIdentifier(
  value: Record<string, unknown>,
  key: string,
  path: string,
  issues: StudioCodecIssue[],
): string {
  return readBoundedString(value, key, path, issues, MAX_ENTITY_ID_LENGTH);
}

function readNullableBoundedString(
  value: Record<string, unknown>,
  key: string,
  path: string,
  issues: StudioCodecIssue[],
  maximumLength: number,
): string | null {
  const candidate = readNullableString(value, key, path, issues);
  if (candidate === null) return null;
  if (Array.from(candidate).length > maximumLength) {
    issue(
      issues,
      `${path}.${key}`,
      "string_too_long",
      `La chaîne ne doit pas dépasser ${maximumLength} caractères.`,
    );
  }
  if (/[\u0000-\u001F\u007F]/u.test(candidate)) {
    issue(issues, `${path}.${key}`, "control_character", "Les caractères de contrôle sont interdits.");
  }
  return candidate;
}

function readProjectStatus(
  value: Record<string, unknown>,
  key: string,
  path: string,
  issues: StudioCodecIssue[],
): ProjectStatus {
  const candidate = value[key];
  if (typeof candidate !== "string" || !PROJECT_STATUSES.includes(candidate as ProjectStatus)) {
    issue(issues, `${path}.${key}`, "invalid_project_status", "Le statut du projet est inconnu.");
    return "draft";
  }
  return candidate as ProjectStatus;
}

function readProjectEnvironment(
  value: Record<string, unknown>,
  key: string,
  path: string,
  issues: StudioCodecIssue[],
): ProjectEnvironment {
  const candidate = value[key];
  if (typeof candidate !== "string" || !PROJECT_ENVIRONMENTS.includes(candidate as ProjectEnvironment)) {
    issue(issues, `${path}.${key}`, "invalid_project_environment", "L’environnement du projet est inconnu.");
    return "development";
  }
  return candidate as ProjectEnvironment;
}

function readRepositoryUrl(
  value: Record<string, unknown>,
  key: string,
  path: string,
  issues: StudioCodecIssue[],
): string | null {
  const candidate = readNullableString(value, key, path, issues);
  if (candidate === null) return null;
  if (Array.from(candidate).length > MAX_REPOSITORY_URL_LENGTH) {
    issue(
      issues,
      `${path}.${key}`,
      "repository_url_too_long",
      `L’URL du dépôt ne doit pas dépasser ${MAX_REPOSITORY_URL_LENGTH} caractères.`,
    );
    return candidate;
  }
  if (candidate.trim() !== candidate || /[\u0000-\u0020\u007F]/u.test(candidate)) {
    issue(issues, `${path}.${key}`, "invalid_repository_url", "L’URL du dépôt contient des caractères interdits.");
    return candidate;
  }
  try {
    const parsed = new URL(candidate);
    const hasUserInfo = candidate.slice("https://".length).split(/[/?#]/u, 1)[0].includes("@");
    if (
      parsed.protocol !== "https:"
      || !parsed.hostname
      || hasUserInfo
      || parsed.search
      || parsed.hash
    ) {
      issue(
        issues,
        `${path}.${key}`,
        "invalid_repository_url",
        "L’URL du dépôt doit être HTTPS et sans identifiants, paramètres ni fragment.",
      );
    }
  } catch {
    issue(issues, `${path}.${key}`, "invalid_repository_url", "L’URL du dépôt n’est pas valide.");
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
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  const candidate = value[key];
  if (
    typeof candidate !== "number"
    || !Number.isFinite(candidate)
    || candidate <= 0
    || candidate > maximum
  ) {
    issue(
      issues,
      `${path}.${key}`,
      "invalid_weight",
      `Un poids fini strictement positif et inférieur ou égal à ${maximum} est requis.`,
    );
    return 1;
  }
  return candidate;
}

function readArray(
  value: Record<string, unknown>,
  key: string,
  path: string,
  issues: StudioCodecIssue[],
  maximumLength = Number.MAX_SAFE_INTEGER,
): unknown[] {
  const candidate = value[key];
  if (!Array.isArray(candidate)) {
    issue(issues, `${path}.${key}`, "invalid_array", "Un tableau est requis.");
    return [];
  }
  if (candidate.length > maximumLength) {
    issue(
      issues,
      `${path}.${key}`,
      "array_too_long",
      `Le tableau ne doit pas dépasser ${maximumLength} éléments.`,
    );
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
    id: readIdentifier(input, "id", path, issues),
    label: readBoundedString(input, "label", path, issues, MAX_TASK_LABEL_LENGTH),
    weight: readPositiveNumber(input, "weight", path, issues, MAX_TASK_WEIGHT),
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
  const evidence = readNullableBoundedString(
    input,
    "evidence",
    path,
    issues,
    MAX_GATE_EVIDENCE_LENGTH,
  );
  const reason = readNullableBoundedString(
    input,
    "reason",
    path,
    issues,
    MAX_GATE_REASON_LENGTH,
  );
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
    id: readIdentifier(input, "id", path, issues),
    label: readBoundedString(input, "label", path, issues, MAX_MISSION_TITLE_LENGTH),
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
    reason: readBoundedString(input, "reason", path, issues, MAX_BLOCKER_FIELD_LENGTH),
    requiredAction: readBoundedString(
      input,
      "requiredAction",
      path,
      issues,
      MAX_BLOCKER_FIELD_LENGTH,
    ),
    resumeCondition: readBoundedString(
      input,
      "resumeCondition",
      path,
      issues,
      MAX_BLOCKER_FIELD_LENGTH,
    ),
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
  for (const label of MANDATORY_VALIDATION_GATE_LABELS) {
    if (!gates.some((gate) => gate.required && gate.label === label)) {
      issue(
        issues,
        `${path}.gates`,
        "missing_mandatory_gate",
        `La gate obligatoire ${label} est absente.`,
      );
    }
  }
  const task: StudioTaskV3 = {
    id: readIdentifier(input, "id", path, issues),
    label: readBoundedString(input, "label", path, issues, MAX_TASK_LABEL_LENGTH),
    status: readTaskStatus(input, "status", path, issues),
    weight: readPositiveNumber(input, "weight", path, issues, MAX_TASK_WEIGHT),
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
  const tasks = readArray(input, "tasks", path, issues, MAX_TASKS_PER_MISSION).map((task, index) =>
    parseTaskV3(task, `${path}.tasks[${index}]`, issues),
  );
  ensureUniqueIds(tasks, `${path}.tasks`, issues);
  return {
    id: readIdentifier(input, "id", path, issues),
    title: readBoundedString(input, "title", path, issues, MAX_MISSION_TITLE_LENGTH),
    expectedOutcome: readBoundedString(
      input,
      "expectedOutcome",
      path,
      issues,
      MAX_MISSION_OUTCOME_LENGTH,
    ),
    tasks,
  };
}

function parseProjectV3(input: unknown, path: string, issues: StudioCodecIssue[]): LegacyProjectV3 {
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
  const missions = readArray(input, "missions", path, issues, MAX_MISSIONS_PER_PROJECT).map((mission, index) =>
    parseMissionV3(mission, `${path}.missions[${index}]`, issues),
  );
  ensureUniqueIds(missions, `${path}.missions`, issues);
  const activeMissionId = readNullableBoundedString(
    input,
    "activeMissionId",
    path,
    issues,
    MAX_ENTITY_ID_LENGTH,
  );
  if (activeMissionId !== null && !missions.some((mission) => mission.id === activeMissionId)) {
    issue(issues, `${path}.activeMissionId`, "dangling_active_mission", "La mission active n'existe pas dans le projet.");
  }
  return {
    id: readIdentifier(input, "id", path, issues),
    name: readBoundedString(input, "name", path, issues, MAX_PROJECT_NAME_LENGTH),
    description: readBoundedString(
      input,
      "description",
      path,
      issues,
      MAX_PROJECT_DESCRIPTION_LENGTH,
    ),
    createdAt,
    updatedAt,
    activeMissionId,
    missions,
  };
}

function parseStateV3(input: unknown, issues: StudioCodecIssue[]): LegacyStateV3 | null {
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
  const activeProjectId = readNullableBoundedString(
    input,
    "activeProjectId",
    "$",
    issues,
    MAX_ENTITY_ID_LENGTH,
  );
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

function parseProjectV4(input: unknown, path: string, issues: StudioCodecIssue[]): StudioProjectV3 {
  if (!isRecord(input)) {
    issue(issues, path, "invalid_object", "Un projet v4 est requis.");
    return {
      id: "",
      name: "",
      description: "",
      expectedOutcome: "",
      status: "draft",
      environment: "development",
      repositoryUrl: null,
      createdAt: "",
      updatedAt: "",
      activeMissionId: null,
      missions: [],
    };
  }
  rejectUnknownKeys(
    input,
    [
      "id",
      "name",
      "description",
      "expectedOutcome",
      "status",
      "environment",
      "repositoryUrl",
      "createdAt",
      "updatedAt",
      "activeMissionId",
      "missions",
    ],
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
  const missions = readArray(input, "missions", path, issues, MAX_MISSIONS_PER_PROJECT).map((mission, index) =>
    parseMissionV3(mission, `${path}.missions[${index}]`, issues),
  );
  ensureUniqueIds(missions, `${path}.missions`, issues);
  const activeMissionId = readNullableBoundedString(
    input,
    "activeMissionId",
    path,
    issues,
    MAX_ENTITY_ID_LENGTH,
  );
  if (activeMissionId !== null && !missions.some((mission) => mission.id === activeMissionId)) {
    issue(issues, `${path}.activeMissionId`, "dangling_active_mission", "La mission active n'existe pas dans le projet.");
  }
  const project: StudioProjectV3 = {
    id: readIdentifier(input, "id", path, issues),
    name: readBoundedString(input, "name", path, issues, MAX_PROJECT_NAME_LENGTH),
    description: readBoundedString(
      input,
      "description",
      path,
      issues,
      MAX_PROJECT_DESCRIPTION_LENGTH,
    ),
    expectedOutcome: readBoundedString(
      input,
      "expectedOutcome",
      path,
      issues,
      MAX_PROJECT_OUTCOME_LENGTH,
    ),
    status: readProjectStatus(input, "status", path, issues),
    environment: readProjectEnvironment(input, "environment", path, issues),
    repositoryUrl: readRepositoryUrl(input, "repositoryUrl", path, issues),
    createdAt,
    updatedAt,
    activeMissionId,
    missions,
  };
  if (project.status === "completed" && projectProgress(project) !== 100) {
    issue(
      issues,
      `${path}.status`,
      "invalid_completed_project",
      "Un projet completed exige une progression validée à 100 %.",
    );
  }
  return project;
}

function parseStateV4(input: unknown, issues: StudioCodecIssue[]): StudioStateV3 | null {
  if (!isRecord(input)) {
    issue(issues, "$", "invalid_object", "La racine du snapshot doit être un objet.");
    return null;
  }
  rejectUnknownKeys(input, ["version", "revision", "savedAt", "activeProjectId", "projects"], "$", issues);
  if (input.version !== 4) {
    issue(issues, "$.version", "invalid_version", "La version attendue est 4.");
  }
  const savedAt = readString(input, "savedAt", "$", issues);
  validateIsoDate(savedAt, "$.savedAt", issues);
  const projects = readArray(input, "projects", "$", issues).map((project, index) =>
    parseProjectV4(project, `$.projects[${index}]`, issues),
  );
  ensureUniqueIds(projects, "$.projects", issues);
  const activeProjectId = readNullableBoundedString(
    input,
    "activeProjectId",
    "$",
    issues,
    MAX_ENTITY_ID_LENGTH,
  );
  if (activeProjectId !== null && !projects.some((project) => project.id === activeProjectId)) {
    issue(issues, "$.activeProjectId", "dangling_active_project", "Le projet actif n'existe pas.");
  }
  return {
    version: 4,
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
  projects: readonly { id: string }[],
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

function migrateV1(state: LegacyStateV1, savedAt: string, warnings: StudioMigrationWarning[]): LegacyStateV3 {
  const projects = state.projects.map((project, projectIndex): LegacyProjectV3 => {
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

function migrateV2(state: LegacyStateV2, savedAt: string, warnings: StudioMigrationWarning[]): LegacyStateV3 {
  const projects = state.projects.map((project, projectIndex): LegacyProjectV3 => {
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

function migrateV3(state: LegacyStateV3, warnings: StudioMigrationWarning[]): StudioStateV3 {
  return {
    version: 4,
    revision: state.revision,
    savedAt: state.savedAt,
    activeProjectId: state.activeProjectId,
    projects: state.projects.map((project, projectIndex): StudioProjectV3 => {
      warnings.push({
        path: `$.projects[${projectIndex}]`,
        code: "project_metadata_defaulted",
        message: "Les nouveaux paramètres du projet ont reçu des valeurs conservatrices à vérifier.",
      });
      return {
        ...project,
        expectedOutcome: "À définir",
        status: "draft",
        environment: "development",
        repositoryUrl: null,
      };
    }),
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
  if (typeof rawVersion === "number" && Number.isInteger(rawVersion) && rawVersion > 4) {
    return {
      ok: false,
      kind: "unsupported_version",
      version: rawVersion,
      issues: [{ path: "$.version", code: "future_version", message: `La version ${rawVersion} n'est pas supportée.` }],
    };
  }

  if (rawVersion === 4) {
    const issues: StudioCodecIssue[] = [];
    const state = parseStateV4(parsed, issues);
    if (state === null || issues.length > 0) return invalidState(issues);
    return { ok: true, state, migrated: false, sourceVersion: 4, warnings: [] };
  }

  const savedAt = options.now?.() ?? new Date().toISOString();
  const issues: StudioCodecIssue[] = [];
  const warnings: StudioMigrationWarning[] = [];
  let stateV3: LegacyStateV3;
  let sourceVersion: 1 | 2 | 3;

  if (rawVersion === undefined || rawVersion === 1) {
    sourceVersion = 1;
    stateV3 = migrateV1(parseLegacyStateV1(parsed, issues), savedAt, warnings);
  } else if (rawVersion === 2) {
    sourceVersion = 2;
    stateV3 = migrateV2(parseLegacyStateV2(parsed, issues), savedAt, warnings);
  } else if (rawVersion === 3) {
    sourceVersion = 3;
    const parsedV3 = parseStateV3(parsed, issues);
    if (parsedV3 === null) return invalidState(issues);
    stateV3 = parsedV3;
  } else {
    issue(issues, "$.version", "invalid_version", "La version doit être 1, 2, 3 ou 4.");
    return invalidState(issues);
  }

  if (issues.length > 0) return invalidState(issues);
  const intermediateIssues: StudioCodecIssue[] = [];
  const validatedV3 = parseStateV3(stateV3, intermediateIssues);
  if (validatedV3 === null || intermediateIssues.length > 0) return invalidState(intermediateIssues);
  const state = migrateV3(validatedV3, warnings);
  const migratedIssues: StudioCodecIssue[] = [];
  const validatedState = parseStateV4(state, migratedIssues);
  if (validatedState === null || migratedIssues.length > 0) return invalidState(migratedIssues);
  return { ok: true, state: validatedState, migrated: true, sourceVersion, warnings };
}

export function encodeStudioState(state: StudioStateV3): EncodeStudioStateResult {
  const issues: StudioCodecIssue[] = [];
  const validatedState = parseStateV4(state, issues);
  if (validatedState === null || issues.length > 0) return { ok: false, issues };
  return { ok: true, json: JSON.stringify(validatedState) };
}
