"use client";

import { useEffect, useMemo, useState } from "react";
import { createProject, loadStudioState, projectProgress, saveStudioState } from "@/lib/studio-store";
import type { StudioState, StudioTask } from "@/lib/studio-types";

const statusLabel: Record<StudioTask["status"], string> = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Terminé",
  blocked: "Bloqué",
};

export default function StudioWorkspace() {
  const [state, setState] = useState<StudioState | null>(null);

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

  const totalProgress = projectProgress(activeProject);

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

  function advanceTask(taskId: string) {
    setState((current) => {
      if (!current) return current;
      return {
        ...current,
        projects: current.projects.map((project) => {
          if (project.id !== current.activeProjectId) return project;
          const tasks = project.tasks.map((task) => {
            if (task.id !== taskId || task.status === "blocked") return task;
            const nextProgress = Math.min(100, task.progress + 25);
            return {
              ...task,
              progress: nextProgress,
              status: nextProgress === 100 ? "done" as const : "in_progress" as const,
            };
          });
          return { ...project, tasks, updatedAt: new Date().toISOString() };
        }),
      };
    });
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
              exécute les missions, contrôle la qualité et conduit le projet jusqu’à une livraison validée.
            </p>
          </div>
          <div className="message assistant-message">
            <strong>Vision Smart Studio</strong>
            <p>Projet actif : {activeProject.name}. Quel résultat veux-tu atteindre ?</p>
          </div>
        </div>

        <div className="composer">
          <button className="icon-button" aria-label="Mode vocal">◉</button>
          <input aria-label="Message" placeholder="Parle ou écris ton idée, ta mission ou ton objectif…" />
          <button className="send-button">Envoyer</button>
        </div>
      </section>

      <aside className="panel task-panel">
        <div className="task-header">
          <div>
            <p className="eyebrow">EXÉCUTION</p>
            <h2>Progression</h2>
          </div>
          <strong>{totalProgress}%</strong>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${totalProgress}%` }} />
        </div>
        <div className="stack task-list">
          {activeProject.tasks.map((task) => (
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
                <button className="task-action" onClick={() => advanceTask(task.id)}>Avancer +25%</button>
              ) : null}
            </article>
          ))}
        </div>
        <div className="validation-card">
          <p className="eyebrow">VALIDATION</p>
          <strong>Phase 1</strong>
          <p>Architecture → Exécution → Contrôle croisé → Test → Sécurité → Documentation → Validation</p>
        </div>
      </aside>
    </main>
  );
}
