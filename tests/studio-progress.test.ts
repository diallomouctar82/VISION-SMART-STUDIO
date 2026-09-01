import {
  canMarkTaskDone,
  missionProgress,
  projectProgress,
  requiredGatesPass,
  taskProgress,
} from "@/lib/studio-progress";
import type {
  GateStatus,
  StudioMissionV3,
  StudioProjectV3,
  StudioTaskV3,
  StudioValidationGate,
  TaskStatus,
} from "@/lib/studio-types";
import { describe, expect, it } from "vitest";

const NOW = "2026-09-01T10:00:00.000Z";

function gate(
  id: string,
  status: GateStatus = "pending",
  required = true,
): StudioValidationGate {
  const label = id.includes("quality")
    ? "Qualité"
    : id.includes("security")
      ? "Sécurité"
      : id.includes("documentation")
        ? "Documentation"
        : id;
  return {
    id,
    label,
    required,
    status,
    checkedAt: status === "pending" ? null : NOW,
    evidence: status === "passed" ? `preuve-${id}` : null,
    reason: status === "failed" || status === "not_applicable" ? `raison-${id}` : null,
  };
}

function task(overrides: Partial<StudioTaskV3> = {}): StudioTaskV3 {
  const status: TaskStatus = overrides.status ?? "in_progress";
  return {
    id: "task-1",
    label: "Tâche",
    status,
    weight: 1,
    progress: 0,
    checkpoints: [
      { id: "cp-1", label: "Checkpoint 1", weight: 1, verified: false, verifiedAt: null },
      { id: "cp-2", label: "Checkpoint 2", weight: 1, verified: false, verifiedAt: null },
    ],
    gates: [gate("quality"), gate("security"), gate("documentation")],
    blocker: null,
    legacy: null,
    ...overrides,
  };
}

function completedTask(id: string, weight = 1): StudioTaskV3 {
  const candidate = task({
    id,
    weight,
    status: "done",
    checkpoints: [
      { id: `${id}-cp`, label: "Checkpoint", weight: 1, verified: true, verifiedAt: NOW },
    ],
    gates: [
      gate(`${id}-quality`, "passed"),
      gate(`${id}-security`, "passed"),
      gate(`${id}-documentation`, "passed"),
    ],
  });
  return { ...candidate, progress: taskProgress(candidate) };
}

describe("studio-progress", () => {
  it("retourne 0 sans checkpoint vérifié et sans gate satisfaite", () => {
    expect(taskProgress(task())).toBe(0);
  });

  it("pondère les checkpoints vérifiés dans les 90 premiers pourcents", () => {
    const candidate = task({
      checkpoints: [
        { id: "small", label: "Petit", weight: 1, verified: true, verifiedAt: NOW },
        { id: "large", label: "Grand", weight: 3, verified: false, verifiedAt: null },
      ],
    });

    expect(taskProgress(candidate)).toBe(23);
  });

  it("réserve les dix derniers pourcents aux gates requises", () => {
    const checkpoints = [
      { id: "cp", label: "Tout le travail", weight: 1, verified: true, verifiedAt: NOW },
    ];
    expect(taskProgress(task({ checkpoints }))).toBe(90);
    expect(taskProgress(task({ checkpoints, gates: [gate("quality", "passed"), gate("security")] }))).toBe(95);
  });

  it("maintient une tâche prête à 99 tant que la transition done n'est pas effectuée", () => {
    const ready = task({
      status: "in_progress",
      checkpoints: [{ id: "cp", label: "Tout", weight: 1, verified: true, verifiedAt: NOW }],
      gates: [gate("quality", "passed"), gate("security", "passed"), gate("documentation", "passed")],
    });

    expect(requiredGatesPass(ready)).toBe(true);
    expect(canMarkTaskDone(ready)).toBe(true);
    expect(taskProgress(ready)).toBe(99);
    expect(taskProgress({ ...ready, status: "done" })).toBe(100);
  });

  it("accepte un gate requis non applicable uniquement avec une raison", () => {
    const withReason = task({
      gates: [
        gate("quality", "not_applicable"),
        gate("security", "passed"),
        gate("documentation", "passed"),
      ],
    });
    const withoutReason = task({
      gates: [
        { ...gate("quality", "not_applicable"), reason: null },
        gate("security", "passed"),
        gate("documentation", "passed"),
      ],
    });

    expect(requiredGatesPass(withReason)).toBe(true);
    expect(requiredGatesPass(withoutReason)).toBe(false);
  });

  it("ignore les gates optionnelles dans la condition de clôture", () => {
    const candidate = task({
      gates: [
        gate("quality", "passed"),
        gate("security", "passed"),
        gate("documentation", "passed"),
        gate("optional", "failed", false),
      ],
    });
    expect(requiredGatesPass(candidate)).toBe(true);
  });

  it("refuse la clôture sans gate requise", () => {
    const candidate = task({ gates: [gate("optional", "passed", false)] });
    expect(requiredGatesPass(candidate)).toBe(false);
    expect(canMarkTaskDone(candidate)).toBe(false);
  });

  it("refuse la clôture d'une tâche bloquée même si le reste est validé", () => {
    const blocked = task({
      status: "blocked",
      checkpoints: [{ id: "cp", label: "Tout", weight: 1, verified: true, verifiedAt: NOW }],
      gates: [gate("quality", "passed")],
      blocker: {
        reason: "Accès absent",
        requiredAction: "Fournir l'accès",
        resumeCondition: "Accès confirmé",
        blockedAt: NOW,
      },
    });
    expect(canMarkTaskDone(blocked)).toBe(false);
    expect(taskProgress(blocked)).toBe(99);
  });

  it("refuse la clôture lorsqu'un checkpoint minoritaire reste non vérifié", () => {
    const candidate = task({
      status: "in_progress",
      checkpoints: [
        { id: "verified", label: "Vérifié", weight: 199, verified: true, verifiedAt: NOW },
        { id: "pending", label: "Encore ouvert", weight: 1, verified: false, verifiedAt: null },
      ],
      gates: [gate("quality", "passed"), gate("security", "passed"), gate("documentation", "passed")],
    });

    expect(taskProgress(candidate)).toBe(99);
    expect(canMarkTaskDone(candidate)).toBe(false);
  });

  it("calcule la mission avec les poids des tâches", () => {
    const pending = task({ id: "pending", status: "todo", weight: 1 });
    const mission: StudioMissionV3 = {
      id: "mission",
      title: "Mission",
      expectedOutcome: "Résultat",
      tasks: [completedTask("done", 3), pending],
    };

    expect(missionProgress(mission)).toBe(75);
  });

  it("calcule le projet sur toutes les tâches plutôt que par moyenne de missions", () => {
    const project: StudioProjectV3 = {
      id: "project",
      name: "Projet",
      description: "Description",
      expectedOutcome: "Résultat",
      status: "active",
      environment: "development",
      repositoryUrl: null,
      createdAt: NOW,
      updatedAt: NOW,
      activeMissionId: "small",
      missions: [
        { id: "small", title: "Petite", expectedOutcome: "Résultat", tasks: [completedTask("done")] },
        {
          id: "large",
          title: "Grande",
          expectedOutcome: "Résultat",
          tasks: [task({ id: "todo-1", status: "todo" }), task({ id: "todo-2", status: "todo" }), task({ id: "todo-3", status: "todo" })],
        },
      ],
    };

    expect(projectProgress(project)).toBe(25);
  });

  it("interdit 100 aux agrégats lorsqu'une tâche ou une mission reste à clôturer", () => {
    const ready = task({
      id: "ready",
      status: "in_progress",
      progress: 99,
      checkpoints: [
        { id: "ready-cp", label: "Checkpoint", weight: 1, verified: true, verifiedAt: NOW },
      ],
      gates: [
        gate("ready-quality", "passed"),
        gate("ready-security", "passed"),
        gate("ready-documentation", "passed"),
      ],
    });
    const mission: StudioMissionV3 = {
      id: "mission",
      title: "Mission",
      expectedOutcome: "Résultat",
      tasks: [completedTask("done"), ready],
    };
    const project: StudioProjectV3 = {
      id: "project",
      name: "Projet",
      description: "Description",
      expectedOutcome: "Résultat",
      status: "active",
      environment: "development",
      repositoryUrl: null,
      createdAt: NOW,
      updatedAt: NOW,
      activeMissionId: mission.id,
      missions: [mission],
    };

    expect(taskProgress(ready)).toBe(99);
    expect(missionProgress(mission)).toBe(99);
    expect(projectProgress(project)).toBe(99);
    expect(projectProgress({
      ...project,
      missions: [
        { ...mission, tasks: [completedTask("only-done")] },
        { id: "empty", title: "Mission vide", expectedOutcome: "À planifier", tasks: [] },
      ],
    })).toBe(99);
  });

  it("retourne 0 pour les agrégats vides", () => {
    expect(missionProgress({ id: "m", title: "M", expectedOutcome: "R", tasks: [] })).toBe(0);
    expect(projectProgress({
      id: "p",
      name: "P",
      description: "D",
      expectedOutcome: "R",
      status: "draft",
      environment: "development",
      repositoryUrl: null,
      createdAt: NOW,
      updatedAt: NOW,
      activeMissionId: null,
      missions: [],
    })).toBe(0);
  });

  it("ne modifie jamais les structures d'entrée", () => {
    const candidate = task();
    const before = structuredClone(candidate);
    taskProgress(candidate);
    expect(candidate).toEqual(before);
  });
});
