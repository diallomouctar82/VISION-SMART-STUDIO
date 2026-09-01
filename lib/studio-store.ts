import type { StudioMission, StudioProject, StudioState, StudioTask } from "./studio-types";

const STORAGE_KEY = "vision-smart-studio:phase1";

const now = () => new Date().toISOString();

export const initialState: StudioState = {
  version: 2,
  activeProjectId: "vision-smart-studio",
  projects: [
    {
      id: "vision-smart-studio",
      name: "Vision Smart Studio",
      description: "Plateforme d'orchestration IA de bout en bout.",
      createdAt: now(),
      updatedAt: now(),
      missions: [
        {
          id: "phase-1-foundation",
          title: "Phase 1 — Fondation du workspace",
          expectedOutcome: "Un workspace visuel persistant, structuré en projets, missions et tâches avec progression réelle.",
          tasks: [
            { id: "foundation", label: "Fondations", status: "done", progress: 100 },
            { id: "workspace", label: "Workspace visuel", status: "in_progress", progress: 70 },
            { id: "task-engine", label: "Moteur de missions et tâches", status: "in_progress", progress: 50 },
            { id: "validation", label: "Validation Phase 1", status: "todo", progress: 0 }
          ]
        }
      ]
    }
  ]
};

type LegacyProject = Omit<StudioProject, "missions"> & { tasks?: StudioTask[]; missions?: StudioMission[] };
type LegacyState = Omit<StudioState, "version" | "projects"> & { version?: number; projects?: LegacyProject[] };

function migrateState(rawState: LegacyState): StudioState {
  const projects = (rawState.projects ?? []).map((project) => {
    if (project.missions?.length) {
      return { ...project, missions: project.missions } as StudioProject;
    }

    const tasks = project.tasks?.length ? project.tasks : [
      { id: `${project.id}-discovery`, label: "Cadrage du besoin", status: "todo" as const, progress: 0 },
      { id: `${project.id}-architecture`, label: "Architecture", status: "todo" as const, progress: 0 },
      { id: `${project.id}-delivery`, label: "Livraison", status: "todo" as const, progress: 0 }
    ];

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      missions: [{
        id: `${project.id}-mission-1`,
        title: "Mission principale",
        expectedOutcome: "Livrer le résultat attendu du projet.",
        tasks,
      }],
    };
  });

  return {
    version: 2,
    activeProjectId: rawState.activeProjectId ?? projects[0]?.id ?? initialState.activeProjectId,
    projects: projects.length ? projects : initialState.projects,
  };
}

export function loadStudioState(): StudioState {
  if (typeof window === "undefined") return initialState;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialState;

  try {
    return migrateState(JSON.parse(raw) as LegacyState);
  } catch {
    return initialState;
  }
}

export function saveStudioState(state: StudioState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createProject(name: string): StudioProject {
  const timestamp = now();
  const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "project"}-${Date.now()}`;

  return {
    id,
    name,
    description: "Nouveau projet Vision Smart Studio",
    createdAt: timestamp,
    updatedAt: timestamp,
    missions: [
      {
        id: `${id}-mission-1`,
        title: "Mission principale",
        expectedOutcome: "Transformer l'idée initiale en résultat validé.",
        tasks: [
          { id: `${id}-discovery`, label: "Cadrage du besoin", status: "todo", progress: 0 },
          { id: `${id}-architecture`, label: "Architecture", status: "todo", progress: 0 },
          { id: `${id}-delivery`, label: "Livraison", status: "todo", progress: 0 }
        ]
      }
    ]
  };
}

export function normalizeTask(task: StudioTask): StudioTask {
  const progress = Math.max(0, Math.min(100, task.progress));
  const status = progress === 100 ? "done" : progress > 0 ? "in_progress" : task.status;
  return { ...task, progress, status };
}

export function missionProgress(mission: StudioMission): number {
  if (!mission.tasks.length) return 0;
  return Math.round(mission.tasks.reduce((sum, task) => sum + task.progress, 0) / mission.tasks.length);
}

export function projectProgress(project: StudioProject): number {
  if (!project.missions.length) return 0;
  return Math.round(project.missions.reduce((sum, mission) => sum + missionProgress(mission), 0) / project.missions.length);
}
