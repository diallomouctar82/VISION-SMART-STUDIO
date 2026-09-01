import type { StudioMissionV3, StudioProjectV3, StudioTaskV3 } from "./studio-types";

function validWeight(weight: number): boolean {
  return Number.isFinite(weight) && weight > 0;
}

function roundPercentage(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function requiredGatesPass(task: StudioTaskV3): boolean {
  const requiredGates = task.gates.filter((gate) => gate.required);
  return requiredGates.length > 0 && requiredGates.every(
    (gate) => gate.status === "passed" || (gate.status === "not_applicable" && Boolean(gate.reason?.trim())),
  );
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
  const satisfied = requiredGates.filter(
    (gate) => gate.status === "passed" || (gate.status === "not_applicable" && Boolean(gate.reason?.trim())),
  ).length;
  return (satisfied / requiredGates.length) * 100;
}

function taskReadinessProgress(task: StudioTaskV3): number {
  // Verified execution checkpoints own 90% and mandatory validation gates own
  // the final 10%. This makes 100 mathematically impossible before validation.
  return roundPercentage(checkpointProgress(task) * 0.9 + requiredGateProgress(task) * 0.1);
}

export function taskProgress(task: StudioTaskV3): number {
  const progress = taskReadinessProgress(task);

  if (progress === 100 && (task.blocker !== null || task.status !== "done" || !requiredGatesPass(task))) {
    return 99;
  }

  return progress;
}

export function canMarkTaskDone(task: StudioTaskV3): boolean {
  return task.blocker === null && requiredGatesPass(task) && taskReadinessProgress(task) === 100;
}

export function missionProgress(mission: StudioMissionV3): number {
  const tasks = mission.tasks.filter((task) => validWeight(task.weight));
  const totalWeight = tasks.reduce((sum, task) => sum + task.weight, 0);

  if (totalWeight === 0) return 0;

  const weightedProgress = tasks.reduce(
    (sum, task) => sum + taskProgress(task) * task.weight,
    0,
  );
  const progress = roundPercentage(weightedProgress / totalWeight);

  return progress;
}

export function projectProgress(project: StudioProjectV3): number {
  const tasks = project.missions.flatMap((mission) => mission.tasks).filter((task) => validWeight(task.weight));
  const totalWeight = tasks.reduce((sum, task) => sum + task.weight, 0);

  if (totalWeight === 0) return 0;

  const weightedProgress = tasks.reduce(
    (sum, task) => sum + taskProgress(task) * task.weight,
    0,
  );
  const progress = roundPercentage(weightedProgress / totalWeight);

  return progress;
}
