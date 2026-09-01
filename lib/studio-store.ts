import type { StudioProject, StudioState, StudioTask } from "./studio-types";

const STORAGE_KEY = "vision-smart-studio:phase1";

export const initialState: StudioState = {
  activeProjectId: "vision-smart-studio",
  projects: [
    {
      id: "vision-smart-studio",
      name: "Vision Smart Studio",
      description: "Plateforme d'orchestration IA de bout en bout.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tasks: [
        { id: "foundation", label: "Fondations", status: "done", progress: 100 },
        { id: "workspace", label: "Workspace visuel", status: "in_progress", progress: 55 },
        { id: "task-engine", label: "Moteur de tâches", status: "todo", progress: 0 }
      ]
    }
  ]
};

export function loadStudioState(): StudioState {
  if (typeof window === "undefined") return initialState;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialState;
  try {
    const parsed = JSON.parse(raw) as StudioState;
    return parsed.projects?.length ? parsed : initialState;
  } catch {
    return initialState;
  }
}

export function saveStudioState(state: StudioState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createProject(name: string): StudioProject {
  const now = new Date().toISOString();
  const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "project"}-${Date.now()}`;
  return {
    id,
    name,
    description: "Nouveau projet Vision Smart Studio",
    createdAt: now,
    updatedAt: now,
    tasks: [
      { id: `${id}-discovery`, label: "Cadrage du besoin", status: "todo", progress: 0 },
      { id: `${id}-architecture`, label: "Architecture", status: "todo", progress: 0 },
      { id: `${id}-delivery`, label: "Livraison", status: "todo", progress: 0 }
    ]
  };
}

export function normalizeTask(task: StudioTask): StudioTask {
  const progress = Math.max(0, Math.min(100, task.progress));
  const status = progress === 100 ? "done" : progress > 0 ? "in_progress" : task.status;
  return { ...task, progress, status };
}

export function projectProgress(project: StudioProject): number {
  if (!project.tasks.length) return 0;
  return Math.round(project.tasks.reduce((sum, task) => sum + task.progress, 0) / project.tasks.length);
}
