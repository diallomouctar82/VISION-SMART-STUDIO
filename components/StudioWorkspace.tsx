"use client";

import { useEffect, useMemo, useState } from "react";
import { createProject, loadStudioState, missionProgress, projectProgress, saveStudioState } from "@/lib/studio-store";
import type { StudioState, StudioTask } from "@/lib/studio-types";
import { startSpecificationSession, type SpecificationSession } from "@/lib/ai-core-specification";

interface SpeechResultEvent { results: ArrayLike<{ 0: { transcript: string } }> }
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  start(): void;
}

const statusLabel: Record<StudioTask["status"], string> = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Terminé",
  blocked: "Bloqué",
};

export default function StudioWorkspace() {
  const [state, setState] = useState<StudioState | null>(null);
  const [intent, setIntent] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [specification, setSpecification] = useState<SpecificationSession | null>(null);
  const [specificationError, setSpecificationError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setState(loadStudioState());
  }, []);

  useEffect(() => {
    if (state) saveStudioState(state);
  }, [state]);

  const activeProject = useMemo(() => {
    if (!state) return null;
    return state.projects.find((project) => project.id === state.activeProjectId) ?? state.projects[0] ?? null;
  }, [state]);

  if (!state || !activeProject) {
    return <main className="loading-screen">Chargement de Vision Smart Studio…</main>;
  }

  const activeMission = activeProject.missions[0] ?? null;
  const totalProgress = projectProgress(activeProject);
  const currentMissionProgress = activeMission ? missionProgress(activeMission) : 0;

  function addProject() {
    const name = window.prompt("Nom du nouveau projet");
    if (!name?.trim()) return;
    const project = createProject(name.trim());
    setState((current) => current ? {
      ...current,
      activeProjectId: project.id,
      projects: [...current.projects, project],
    } : current);
  }

  function selectProject(projectId: string) {
    setState((current) => current ? { ...current, activeProjectId: projectId } : current);
  }

  function advanceTask(missionId: string, taskId: string) {
    setState((current) => {
      if (!current) return current;
      return {
        ...current,
        projects: current.projects.map((project) => {
          if (project.id !== current.activeProjectId) return project;
          const missions = project.missions.map((mission) => {
            if (mission.id !== missionId) return mission;
            const tasks = mission.tasks.map((task) => {
              if (task.id !== taskId || task.status === "blocked") return task;
              const nextProgress = Math.min(100, task.progress + 25);
              return {
                ...task,
                progress: nextProgress,
                status: nextProgress === 100 ? "done" as const : "in_progress" as const,
              };
            });
            return { ...mission, tasks };
          });
          return { ...project, missions, updatedAt: new Date().toISOString() };
        }),
      };
    });
  }

  async function sendIntent() {
    if (!intent.trim() || sending) return;
    setSending(true);
    setSpecificationError(null);
    try {
      const result = await startSpecificationSession({
        projectId: activeProject.id,
        missionId: activeMission?.id ?? `discovery-${activeProject.id}`,
        intent: intent.trim(),
        inputMode,
        knownContext: {
          projectName: activeProject.name,
          missionTitle: activeMission?.title,
          expectedOutcome: activeMission?.expectedOutcome,
        },
      });
      setSpecification(result);
      setIntent("");
      setInputMode("text");
    } catch (error) {
      setSpecificationError(error instanceof Error ? error.message : "AI_CORE_UNAVAILABLE");
    } finally {
      setSending(false);
    }
  }

  function startVoiceInput() {
    const SpeechRecognition = (window as unknown as {
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpecificationError("VOICE_RECOGNITION_UNAVAILABLE");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      setIntent(event.results[0][0].transcript);
      setInputMode("voice");
    };
    recognition.onerror = () => setSpecificationError("VOICE_RECOGNITION_FAILED");
    recognition.start();
  }

  return (
    <main className="studio-shell">
      <aside className="panel sidebar">
        <div>
          <p className="eyebrow">VISION SMART</p>
          <h1>Studio</h1>
        </div>
        <button className="primary-button" onClick={addProject}>+ Nouveau projet</button>
        <section>
          <h2>Projets</h2>
          <div className="stack">
            {state.projects.map((project) => (
              <button
                className={project.id === activeProject.id ? "project active" : "project"}
                key={project.id}
                onClick={() => selectProject(project.id)}
              >
                <span className="project-dot" />
                <span>{project.name}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="sidebar-footer">
          <span className="status-dot" /> État projet sauvegardé localement
        </section>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">PROJET ACTIF</p>
            <h2>{activeProject.name}</h2>
          </div>
          <div className="model-pill">Sélection modèle · Intelligent</div>
        </header>

        <div className="conversation">
          <div className="hero-card">
            <span className="hero-icon">✦</span>
            <h3>De l’idée au résultat.</h3>
            <p>
              Décris ton objectif naturellement. L’équipe IA structure le besoin, prépare l’architecture,
              exécute les missions, se contrôle mutuellement et conduit le projet jusqu’à une livraison validée.
            </p>
          </div>
          <div className="message assistant-message">
            <strong>Vision Smart Studio · AI Core Spec Kit</strong>
            <p>Projet actif : {activeProject.name}. Quel résultat veux-tu atteindre ?</p>
          </div>
          {specification ? (
            <div className="message assistant-message" data-stage={specification.stage}>
              <strong>{specification.stage}</strong>
              <p>{specification.question ?? specification.message}</p>
            </div>
          ) : null}
          {specificationError ? (
            <div className="message assistant-message" role="alert">
              <strong>AI Core indisponible</strong>
              <p>{specificationError === "AI_CORE_NOT_CONFIGURED"
                ? "Le point d’entrée AI Core doit être configuré. Aucun résultat n’est simulé."
                : specificationError}</p>
            </div>
          ) : null}
        </div>

        <div className="composer">
          <button className="icon-button" aria-label="Mode vocal" onClick={startVoiceInput}>◉</button>
          <input
            aria-label="Message"
            placeholder="Parle ou écris ton idée, ta mission ou ton objectif…"
            value={intent}
            onChange={(event) => { setIntent(event.target.value); setInputMode("text"); }}
            onKeyDown={(event) => { if (event.key === "Enter") void sendIntent(); }}
          />
          <button className="send-button" disabled={sending || !intent.trim()} onClick={() => void sendIntent()}>
            {sending ? "Analyse…" : "Envoyer"}
          </button>
        </div>
      </section>

      <aside className="panel task-panel">
        <div className="task-header">
          <div>
            <p className="eyebrow">PROJET</p>
            <h2>Progression</h2>
          </div>
          <strong>{totalProgress}%</strong>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${totalProgress}%` }} />
        </div>

        {activeMission ? (
          <section className="mission-block">
            <div className="mission-heading">
              <div>
                <p className="eyebrow">MISSION ACTIVE</p>
                <strong>{activeMission.title}</strong>
              </div>
              <span>{currentMissionProgress}%</span>
            </div>
            <p className="mission-outcome">{activeMission.expectedOutcome}</p>
            <div className="stack task-list">
              {activeMission.tasks.map((task) => (
                <article className="task-card" key={task.id}>
                  <div className="task-line">
                    <strong>{task.label}</strong>
                    <span>{task.progress}%</span>
                  </div>
                  <p>{statusLabel[task.status]}</p>
                  <div className="mini-track">
                    <div className="mini-fill" style={{ width: `${task.progress}%` }} />
                  </div>
                  {task.status !== "done" && task.status !== "blocked" ? (
                    <button className="task-action" onClick={() => advanceTask(activeMission.id, task.id)}>
                      Avancer +25%
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : (
          <div className="validation-card">Aucune mission active.</div>
        )}

        <div className="validation-card">
          <p className="eyebrow">VALIDATION</p>
          <strong>Phase 1</strong>
          <p>Architecture → Exécution → Contrôle croisé → Test → Sécurité → Documentation → Consolidation → Validation</p>
        </div>
      </aside>
    </main>
  );
}
