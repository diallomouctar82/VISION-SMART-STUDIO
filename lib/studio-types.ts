export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";

export type StudioTask = {
  id: string;
  label: string;
  status: TaskStatus;
  progress: number;
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
  missions: StudioMission[];
};

export type StudioState = {
  version: 2;
  activeProjectId: string;
  projects: StudioProject[];
};
