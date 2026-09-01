import {
  MANDATORY_VALIDATION_GATE_LABELS,
  type StudioMissionV3,
  type StudioProjectV3,
  type StudioTaskV3,
  type StudioValidationGate,
} from "./studio-types";

function validWeight(weight: number): boolean {
  return Number.isFinite(weight) && weight > 0;
}

function roundPercentage(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function gatePasses(gate: StudioValidationGate): boolean {
  return gate.status === "passed"
    || (gate.status === "not_applicable" && Boolean(gate.reason?.trim()));
}

function allCheckpointsVerified(task: StudioTaskV3): boolean {
  return task.checkpoints.length > 0
    && task.checkpoints.every((checkpoint) => validWeight(checkpoint.weight) && checkpoint.verified);
}

export function requiredGatesPass(task: StudioTaskV3): boolean {
  const requiredGates = task.gates.filter((gate) => gate.required);
  return requiredGates.every(gatePasses)
    && MANDATORY_VALIDATION_GATE_LABELS.every((label) => (
      requiredGates.some((gate) => gate.label === label && gatePasses(gate))
    ));
}

function checkpointProgress(task: StudioTaskV3): number {
  const checkpoints = task.checkpoints.filter((checkpoint) => validWeight(checkpoint.weight));
  const totalWeight = checkpoints.reduce((sum, checkpoint) => sum + checkpoint.weight, 0);

  if (totalWeight === 0) return 0;

  const verifiedWeight = checkpoints.reduce(
    (sum, checkpoint) => sum + (checkpoint.verified ? checkpoint.weight : 0),
    0,
  );

  return (verifiedWeight / totalWeight) * 100;
}

function requiredGateProgress(task: StudioTaskV3): number {
  const requiredGates = task.gates.filter((gate) => gate.required);
  if (requiredGates.length === 0) return 0;
  const satisfied = requiredGates.filter(gatePasses).length;
  return (satisfied / requiredGates.length) * 100;
}

function taskReadinessProgress(task: StudioTaskV3): number {
  // Verified execution checkpoints own 90% and mandatory validation gates own
  // the final 10%. This makes 100 mathematically impossible before validation.
  return roundPercentage(checkpointProgress(task) * 0.9 + requiredGateProgress(task) * 0.1);
}

function aggregateTaskProgress(tasks: readonly StudioTaskV3[]): number {
  const weightedTasks = tasks.filter((task) => validWeight(task.weight));
  const totalWeight = weightedTasks.reduce((sum, task) => sum + task.weight, 0);

  if (totalWeight === 0) return 0;

  const progressByTask = weightedTasks.map((task) => ({
    progress: taskProgress(task),
    weight: task.weight,
  }));
  const weightedProgress = progressByTask.reduce(
    (sum, task) => sum + task.progress * task.weight,
    0,
  );
  const progress = roundPercentage(weightedProgress / totalWeight);

  // Nearest-integer rounding must never turn an incomplete 99.x aggregate
  // into 100. Every contributing task has to be individually complete.
  return progress === 100 && progressByTask.some((task) => task.progress < 100)
    ? 99
    : progress;
}

export function taskProgress(task: StudioTaskV3): number {
  const progress = taskReadinessProgress(task);

  if (
    progress === 100
    && (
      task.blocker !== null
      || task.status !== "done"
      || !allCheckpointsVerified(task)
      || !requiredGatesPass(task)
    )
  ) {
    return 99;
  }

  return progress;
}

export function canMarkTaskDone(task: StudioTaskV3): boolean {
  return task.blocker === null
    && allCheckpointsVerified(task)
    && requiredGatesPass(task)
    && taskReadinessProgress(task) === 100;
}

export function missionProgress(mission: StudioMissionV3): number {
  return aggregateTaskProgress(mission.tasks);
}

export function projectProgress(project: StudioProjectV3): number {
  const progress = aggregateTaskProgress(project.missions.flatMap((mission) => mission.tasks));

  // An empty or otherwise incomplete mission cannot disappear from the
  // project-level verdict merely because it contributes no task weight.
  return progress === 100 && project.missions.some((mission) => missionProgress(mission) < 100)
    ? 99
    : progress;
}
