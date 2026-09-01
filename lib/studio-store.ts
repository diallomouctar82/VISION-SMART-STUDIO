import {
  createInitialStudioState,
  type StudioIdKind,
  type StudioServiceDependencies,
} from "./studio-service";

export {
  blockTask,
  createActivity,
  createInitialStudioState,
  createMission,
  createProject,
  createTask,
  MAX_INITIAL_ACTIVITY_COUNT,
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
} from "./studio-service";
export type {
  BlockTaskCommand,
  CreateMissionCommand,
  CreateProjectCommand,
  CreateTaskCommand,
  RecordGateResultCommand,
  SelectMissionCommand,
  StudioServiceDependencies,
  StudioServiceError,
  StudioServiceErrorCode,
  StudioServiceResult,
  TaskTarget,
  ToggleCheckpointCommand,
  UpdateProjectCommand,
} from "./studio-service";
export {
  canMarkTaskDone,
  missionProgress,
  projectProgress,
  requiredGatesPass,
  taskProgress,
} from "./studio-progress";

export const STUDIO_STATE_VERSION = 4 as const;

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
