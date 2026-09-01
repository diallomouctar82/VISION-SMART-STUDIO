export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";

export type StudioTask = {
  id: string;
  label: string;
  status: TaskStatus;
  progress: number;
};

export type StudioProject = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  tasks: StudioTask[];
};

export type StudioState = {
  activeProjectId: string;
  projects: StudioProject[];
};
