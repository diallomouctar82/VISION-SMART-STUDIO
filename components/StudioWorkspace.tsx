"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConversationWorkspace from "@/components/ConversationWorkspace";
import MissionPanel from "@/components/MissionPanel";
import type { GateStatusUpdate } from "@/components/MissionPanel";
import ProjectExplorer from "@/components/ProjectExplorer";
import type { PersistencePresentation } from "@/components/ProjectExplorer";
import type {
  ProjectSettingsValues,
  ProjectSetupValues,
} from "@/components/ProjectSetupDialog";
import {
  LocalStorageStudioRepository,
  STUDIO_STORAGE_KEY,
  type RepositoryLoadResult,
  type RepositorySaveResult,
  type StudioStateRepository,
} from "@/lib/studio-repository";
import {
  blockTask,
  createMission,
  createProject,
  createTask,
  initialState,
  recordGateResult,
  requestTaskCompletion,
  selectMission,
  selectProject,
  sendProjectMessage,
  toggleCheckpoint,
  unblockTask,
  updateProject,
} from "@/lib/studio-store";
import type {
  StudioServiceDependencies,
  StudioServiceResult,
} from "@/lib/studio-service";
import type { StudioStateV3 } from "@/lib/studio-types";

type WorkspaceViewState = {
  state: StudioStateV3;
  persistence: PersistencePresentation;
  writable: boolean;
};

type CommandOutcome = {
  ok: boolean;
  message?: string;
};

type StateCommand = (
  state: StudioStateV3,
  dependencies: StudioServiceDependencies,
) => StudioServiceResult<StudioStateV3>;

function browserDependencies(): StudioServiceDependencies {
  return {
    now: () => new Date().toISOString(),
    createId: (kind) => `${kind}-${globalThis.crypto.randomUUID()}`,
  };
}

async function withStudioStorageLock<T>(operation: () => Promise<T>): Promise<T> {
  const lockManager = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (!lockManager) return operation();
  return lockManager.request(
    STUDIO_STORAGE_KEY + "-write",
    { mode: "exclusive" },
    operation,
  );
}

function loadView(result: RepositoryLoadResult): WorkspaceViewState {
  switch (result.status) {
    case "empty":
      return {
        state: initialState,
        persistence: {
          status: "idle",
          message: "Aucun état local enregistré — la première modification déclenchera la sauvegarde.",
        },
        writable: true,
      };
    case "loaded":
      return {
        state: result.state,
        persistence: {
          status: "saved",
          message: `État local chargé — révision ${result.state.revision}.`,
        },
        writable: true,
      };
    case "migrated":
      return {
        state: result.state,
        persistence: {
          status: "migrated",
          message: `État local migré depuis la version ${result.fromVersion} avec sauvegarde de récupération.`,
        },
        writable: true,
      };
    case "corrupt":
      return {
        state: initialState,
        persistence: {
          status: "recovery_required",
          message: `État local corrompu détecté (${result.issues.length} anomalie${result.issues.length > 1 ? "s" : ""}). Aucune donnée n’a été écrasée.`,
        },
        writable: false,
      };
    case "unsupported_version":
      return {
        state: initialState,
        persistence: {
          status: "recovery_required",
          message: `Version locale ${result.version} non prise en charge. Aucune donnée n’a été écrasée.`,
        },
        writable: false,
      };
    case "storage_error":
      return {
        state: initialState,
        persistence: {
          status: "error",
          message: "Stockage local indisponible. Consultation temporaire uniquement, sans écriture.",
        },
        writable: false,
      };
  }
}

function saveFailureView(result: Exclude<RepositorySaveResult, { status: "saved" }>): {
  persistence: PersistencePresentation;
  writable: false;
} {
  switch (result.status) {
    case "conflict":
      return {
        persistence: {
          status: "conflict",
          message: `Conflit de révision : attendu ${result.expectedRevision}, trouvé ${result.actualRevision}. Recharge requise.`,
        },
        writable: false,
      };
    case "invalid_state":
      return {
        persistence: {
          status: "recovery_required",
          message: `État non sauvegardé : ${result.issues.length} incohérence${result.issues.length > 1 ? "s" : ""} à corriger.`,
        },
        writable: false,
      };
    case "migration_required":
      return {
        persistence: {
          status: "recovery_required",
          message: `Migration locale depuis la version ${result.fromVersion} requise avant toute écriture.`,
        },
        writable: false,
      };
    case "corrupt":
      return {
        persistence: {
          status: "recovery_required",
          message: "Sauvegarde bloquée : l’état local existant est corrompu et n’a pas été écrasé.",
        },
        writable: false,
      };
    case "unsupported_version":
      return {
        persistence: {
          status: "recovery_required",
          message: `Sauvegarde bloquée : version locale ${result.version} non prise en charge.`,
        },
        writable: false,
      };
    case "storage_error":
      return {
        persistence: {
          status: "error",
          message: "La sauvegarde locale a échoué. L’état affiché n’a pas été déclaré enregistré.",
        },
        writable: false,
      };
  }
}

export default function StudioWorkspace() {
  const [workspace, setWorkspace] = useState<WorkspaceViewState | null>(null);
  const repositoryRef = useRef<StudioStateRepository | null>(null);
  const dependenciesRef = useRef<StudioServiceDependencies | null>(null);
  const stateRef = useRef<StudioStateV3>(initialState);
  const writableRef = useRef(false);
  const hasPersistedSnapshotRef = useRef(false);
  const loadPromiseRef = useRef<Promise<RepositoryLoadResult> | null>(null);
  const operationQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let isCurrent = true;

    if (!loadPromiseRef.current) {
      loadPromiseRef.current = Promise.resolve().then(async () => {
        try {
          const dependencies = browserDependencies();
          const repository = new LocalStorageStudioRepository(window.localStorage, {
            now: dependencies.now,
          });
          dependenciesRef.current = dependencies;
          repositoryRef.current = repository;
          return await repository.load();
        } catch {
          return {
            status: "storage_error" as const,
            operation: "read" as const,
            storageKey: "vision-smart-studio:state",
            message: "Initialisation du stockage impossible.",
          };
        }
      });
    }

    void loadPromiseRef.current.then((result) => {
      if (!isCurrent) return;
      const nextView = loadView(result);
      stateRef.current = nextView.state;
      writableRef.current = nextView.writable;
      hasPersistedSnapshotRef.current = result.status === "loaded" || result.status === "migrated";
      setWorkspace(nextView);
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  const enqueueCommand = useCallback((command: StateCommand): Promise<CommandOutcome> => {
    const execute = async (): Promise<CommandOutcome> => {
      const repository = repositoryRef.current;
      const dependencies = dependenciesRef.current;

      if (!repository || !dependencies || !writableRef.current) {
        return {
          ok: false,
          message: "Les modifications sont indisponibles tant que l’état local n’est pas récupéré.",
        };
      }

      setWorkspace((current) => current ? {
        ...current,
        persistence: { status: "loading", message: "Enregistrement local en cours…" },
      } : current);

      try {
        const currentState = stateRef.current;
        const serviceResult = command(currentState, dependencies);

        if (!serviceResult.ok) {
          setWorkspace((current) => current ? {
            ...current,
            persistence: { status: "error", message: serviceResult.error.message },
          } : current);
          return { ok: false, message: serviceResult.error.message };
        }

        if (serviceResult.value === currentState) {
          setWorkspace((current) => current ? {
            ...current,
            persistence: {
              status: hasPersistedSnapshotRef.current ? "saved" : "idle",
              message: hasPersistedSnapshotRef.current
                ? `Aucun changement à enregistrer — révision ${currentState.revision}.`
                : "Aucun changement — l’état initial n’est pas encore enregistré localement.",
            },
          } : current);
          return { ok: true };
        }

        const saveResult = await withStudioStorageLock(
          () => repository.save(serviceResult.value, currentState.revision),
        );
        if (saveResult.status === "saved") {
          stateRef.current = saveResult.state;
          writableRef.current = true;
          hasPersistedSnapshotRef.current = true;
          setWorkspace({
            state: saveResult.state,
            persistence: {
              status: "saved",
              message: `État local enregistré — révision ${saveResult.state.revision}.`,
            },
            writable: true,
          });
          return { ok: true };
        }

        const failure = saveFailureView(saveResult);
        writableRef.current = false;
        setWorkspace((current) => current ? {
          ...current,
          persistence: failure.persistence,
          writable: failure.writable,
        } : current);
        return { ok: false, message: failure.persistence.message };
      } catch {
        writableRef.current = false;
        setWorkspace((current) => current ? {
          ...current,
          persistence: {
            status: "error",
            message: "Une erreur inattendue a interrompu l’opération. Aucun enregistrement n’est déclaré.",
          },
          writable: false,
        } : current);
        return { ok: false, message: "Opération interrompue sans sauvegarde." };
      }
    };

    const queued = operationQueueRef.current.then(execute, execute);
    operationQueueRef.current = queued.then(() => undefined, () => undefined);
    return queued;
  }, []);

  const activeProject = useMemo(() => {
    if (!workspace) return null;
    return workspace.state.projects.find((project) => project.id === workspace.state.activeProjectId)
      ?? null;
  }, [workspace]);

  const executeCommand = useCallback(async (command: StateCommand) => {
    const result = await enqueueCommand(command);
    if (!result.ok) throw new Error(result.message);
  }, [enqueueCommand]);

  const handleCreateProject = useCallback(async (values: ProjectSetupValues) => {
    await executeCommand((state, dependencies) => createProject(state, {
      name: values.name,
      description: values.description,
      expectedOutcome: values.expectedOutcome,
      status: values.status,
      environment: values.environment,
      repositoryUrl: values.repositoryUrl,
      missionTitle: values.missionTitle,
      missionOutcome: values.missionOutcome,
      activityLabels: values.activityLabels,
    }, dependencies));
  }, [executeCommand]);

  const handleUpdateProject = useCallback(async (
    projectId: string,
    values: ProjectSettingsValues,
  ) => {
    await executeCommand((state, dependencies) => updateProject(state, {
      projectId,
      name: values.name,
      description: values.description,
      expectedOutcome: values.expectedOutcome,
      status: values.status,
      environment: values.environment,
      repositoryUrl: values.repositoryUrl,
    }, dependencies));
  }, [executeCommand]);

  const handleCreateMission = useCallback(async (title: string, expectedOutcome: string) => {
    const projectId = stateRef.current.activeProjectId;
    if (!projectId) throw new Error("Sélectionne un projet avant de créer une mission.");
    await executeCommand((state, dependencies) => createMission(
      state,
      { projectId, title, expectedOutcome },
      dependencies,
    ));
  }, [executeCommand]);

  const handleCreateTask = useCallback(async (missionId: string, label: string) => {
    const projectId = stateRef.current.activeProjectId;
    if (!projectId) throw new Error("Sélectionne un projet avant d’ajouter une activité.");
    await executeCommand((state, dependencies) => createTask(
      state,
      { projectId, missionId, label },
      dependencies,
    ));
  }, [executeCommand]);

  const handleSendMessage = useCallback(async (content: string, submissionId: string) => {
    const projectId = stateRef.current.activeProjectId;
    if (!projectId) throw new Error("Sélectionne un projet avant d’envoyer un message.");
    await executeCommand((state, dependencies) => sendProjectMessage(
      state,
      { projectId, content, submissionId },
      dependencies,
    ));
  }, [executeCommand]);

  const handleSelectProject = useCallback((projectId: string) => {
    void enqueueCommand((state, dependencies) => selectProject(state, projectId, dependencies));
  }, [enqueueCommand]);

  const handleSelectMission = useCallback((missionId: string) => {
    const projectId = stateRef.current.activeProjectId;
    if (!projectId) return;
    void enqueueCommand((state, dependencies) => selectMission(
      state,
      { projectId, missionId },
      dependencies,
    ));
  }, [enqueueCommand]);

  const handleToggleCheckpoint = useCallback((
    missionId: string,
    taskId: string,
    checkpointId: string,
    verified: boolean,
  ) => {
    const projectId = stateRef.current.activeProjectId;
    if (!projectId) return;
    void enqueueCommand((state, dependencies) => toggleCheckpoint(
      state,
      { projectId, missionId, taskId, checkpointId, verified },
      dependencies,
    ));
  }, [enqueueCommand]);

  const handleSetGateStatus = useCallback(async (
    missionId: string,
    taskId: string,
    gateId: string,
    update: GateStatusUpdate,
  ) => {
    const projectId = stateRef.current.activeProjectId;
    if (!projectId) throw new Error("Projet actif introuvable.");
    await executeCommand((state, dependencies) => recordGateResult(
      state,
      {
        projectId,
        missionId,
        taskId,
        gateId,
        status: update.status,
        evidence: update.evidence,
        reason: update.reason,
      },
      dependencies,
    ));
  }, [executeCommand]);

  const handleRequestTaskCompletion = useCallback((missionId: string, taskId: string) => {
    const projectId = stateRef.current.activeProjectId;
    if (!projectId) return;
    void enqueueCommand((state, dependencies) => requestTaskCompletion(
      state,
      { projectId, missionId, taskId },
      dependencies,
    ));
  }, [enqueueCommand]);

  const handleBlockTask = useCallback(async (
    missionId: string,
    taskId: string,
    blocker: { reason: string; requiredAction: string; resumeCondition: string },
  ) => {
    const projectId = stateRef.current.activeProjectId;
    if (!projectId) throw new Error("Projet actif introuvable.");
    await executeCommand((state, dependencies) => blockTask(
      state,
      { projectId, missionId, taskId, ...blocker },
      dependencies,
    ));
  }, [executeCommand]);

  const handleClearTaskBlocker = useCallback(async (missionId: string, taskId: string) => {
    const projectId = stateRef.current.activeProjectId;
    if (!projectId) throw new Error("Projet actif introuvable.");
    await executeCommand((state, dependencies) => unblockTask(
      state,
      { projectId, missionId, taskId },
      dependencies,
    ));
  }, [executeCommand]);

  if (!workspace) {
    return <main aria-live="polite" className="loading-screen" role="status">Chargement sécurisé de Vision Smart Studio…</main>;
  }

  const mutationsEnabled = workspace.writable;

  return (
    <main className="studio-shell">
      <ProjectExplorer
        activeProjectId={workspace.state.activeProjectId}
        mutationsDisabled={!mutationsEnabled}
        onCreateProject={handleCreateProject}
        onSelectProject={handleSelectProject}
        onUpdateProject={handleUpdateProject}
        persistence={workspace.persistence}
        projects={workspace.state.projects}
      />
      <ConversationWorkspace
        activeProject={activeProject}
        onSendMessage={mutationsEnabled ? handleSendMessage : undefined}
      />
      <MissionPanel
        activeMissionId={activeProject?.activeMissionId}
        onBlockTask={mutationsEnabled ? handleBlockTask : undefined}
        onClearTaskBlocker={mutationsEnabled ? handleClearTaskBlocker : undefined}
        onCreateMission={mutationsEnabled ? handleCreateMission : undefined}
        onCreateTask={mutationsEnabled ? handleCreateTask : undefined}
        onRequestTaskCompletion={mutationsEnabled ? handleRequestTaskCompletion : undefined}
        onSelectMission={mutationsEnabled ? handleSelectMission : undefined}
        onSetGateStatus={mutationsEnabled ? handleSetGateStatus : undefined}
        onToggleCheckpoint={mutationsEnabled ? handleToggleCheckpoint : undefined}
        project={activeProject}
      />
    </main>
  );
}
