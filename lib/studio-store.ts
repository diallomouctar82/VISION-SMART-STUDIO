import {
  createInitialStudioState,
  type StudioIdKind,
  type StudioServiceDependencies,
} from "./studio-service";

export {
  blockTask,
  createInitialStudioState,
  createProject,
  MAX_PROJECT_NAME_LENGTH,
  recordGateResult,
  requestTaskCompletion,
  selectMission,
  selectProject,
  toggleCheckpoint,
  unblockTask,
} from "./studio-service";
export type {
  BlockTaskCommand,
  CreateProjectCommand,
  RecordGateResultCommand,
  SelectMissionCommand,
  StudioServiceDependencies,
  StudioServiceError,
  StudioServiceErrorCode,
  StudioServiceResult,
  TaskTarget,
  ToggleCheckpointCommand,
} from "./studio-service";
export {
  canMarkTaskDone,
  missionProgress,
  projectProgress,
  requiredGatesPass,
  taskProgress,
} from "./studio-progress";

export const STUDIO_STATE_VERSION = 3 as const;

const INITIAL_TIMESTAMP = "2026-09-01T00:00:00.000Z";

function createSeedDependencies(): StudioServiceDependencies {
  let sequence = 0;

  return {
    now: () => INITIAL_TIMESTAMP,
    createId: (kind: StudioIdKind) => {
      sequence += 1;
      return `seed-${kind}-${String(sequence).padStart(3, "0")}`;
    },
  };
}

const seededState = createInitialStudioState(createSeedDependencies());

if (!seededState.ok) {
  throw new Error(`Impossible d'initialiser Vision Smart Studio : ${seededState.error.code}`);
}

/**
 * Honest Phase 1 seed: every checkpoint is unverified, every required gate is
 * pending and all derived progress values are zero. Persistence is owned by
 * StudioStateRepository implementations, never by this facade.
 */
export const initialState = seededState.value;
