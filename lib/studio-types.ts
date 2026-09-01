export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";

export type GateStatus = "pending" | "passed" | "failed" | "not_applicable";

export const MANDATORY_VALIDATION_GATE_LABELS = [
  "Qualité",
  "Sécurité",
  "Documentation",
] as const;

export type StudioCheckpoint = {
  id: string;
  label: string;
  weight: number;
  verified: boolean;
  verifiedAt: string | null;
};

export type StudioValidationGate = {
  id: string;
  label: string;
  required: boolean;
  status: GateStatus;
  checkedAt: string | null;
  evidence: string | null;
  reason: string | null;
};

export type StudioBlocker = {
  reason: string;
  requiredAction: string;
  resumeCondition: string;
  blockedAt: string;
};

/**
 * Migration provenance. A legacy percentage is retained for traceability but
 * never counted as verified progress by the v3 progress engine.
 */
export type StudioLegacyTaskState = {
  reportedStatus: TaskStatus;
  reportedProgress: number;
};

export type StudioTask = {
  id: string;
  label: string;
  status: TaskStatus;
  weight: number;
  /** Cached derived value. The codec rejects snapshots where it is stale. */
  progress: number;
  checkpoints: StudioCheckpoint[];
  gates: StudioValidationGate[];
  blocker: StudioBlocker | null;
  legacy: StudioLegacyTaskState | null;
};

export type StudioMission = {
  id: string;
  title: string;
  expectedOutcome: string;
  tasks: StudioTask[];
};

export type StudioProject = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  activeMissionId: string | null;
  missions: StudioMission[];
};

export type StudioState = {
  version: 3;
  revision: number;
  savedAt: string;
  activeProjectId: string | null;
  projects: StudioProject[];
};

/** @deprecated Use StudioTask. Kept while Phase 1 consumers finish migration. */
export type StudioTaskV3 = StudioTask;
/** @deprecated Use StudioMission. Kept while Phase 1 consumers finish migration. */
export type StudioMissionV3 = StudioMission;
/** @deprecated Use StudioProject. Kept while Phase 1 consumers finish migration. */
export type StudioProjectV3 = StudioProject;
/** @deprecated Use StudioState. Kept while Phase 1 consumers finish migration. */
export type StudioStateV3 = StudioState;

/** UI-only persistence lifecycle; this value must never enter a snapshot. */
export type PersistenceStatus =
  | "idle"
  | "loading"
  | "saved"
  | "migrated"
  | "conflict"
  | "recovery_required"
  | "error";
