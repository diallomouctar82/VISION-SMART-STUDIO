import { projectProgress } from "@/lib/studio-progress";
import type { StudioProjectV3 } from "@/lib/studio-types";

export type ProjectPreviewProps = {
  project: StudioProjectV3;
};

const projectStatusLabel: Record<StudioProjectV3["status"], string> = {
  draft: "Brouillon",
  active: "Actif",
  paused: "En pause",
  completed: "Terminé",
};

const projectEnvironmentLabel: Record<StudioProjectV3["environment"], string> = {
  development: "Développement",
  staging: "Préproduction",
  production: "Production",
};

export function ProjectPreview({ project }: ProjectPreviewProps) {
  const tasks = project.missions.flatMap((mission) => mission.tasks);
  const checkpoints = tasks.flatMap((task) => task.checkpoints);
  const gates = tasks.flatMap((task) => task.gates);
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const blockedTasks = tasks.filter((task) => task.status === "blocked").length;
  const verifiedCheckpoints = checkpoints.filter((checkpoint) => checkpoint.verified).length;
  const passedGates = gates.filter((gate) => (
    gate.status === "passed" || gate.status === "not_applicable"
  )).length;

  return (
    <article className="project-preview">
      <header className="project-preview__header">
        <div>
          <p className="eyebrow">APERÇU LOCAL</p>
          <h3>{project.name}</h3>
        </div>
        <strong>{projectProgress(project)}% validé</strong>
      </header>

      <div className="project-preview__badges" aria-label="Paramètres principaux">
        <span>{projectStatusLabel[project.status]}</span>
        <span>{projectEnvironmentLabel[project.environment]}</span>
      </div>

      <dl className="project-preview__definition">
        <div>
          <dt>Description</dt>
          <dd>{project.description}</dd>
        </div>
        <div>
          <dt>Résultat attendu</dt>
          <dd>{project.expectedOutcome}</dd>
        </div>
        <div>
          <dt>Dépôt de référence</dt>
          <dd>
            {project.repositoryUrl ? (
              <a href={project.repositoryUrl} rel="noreferrer noopener" target="_blank">
                {project.repositoryUrl}
                <span className="visually-hidden"> (nouvel onglet)</span>
              </a>
            ) : "Aucun dépôt renseigné"}
          </dd>
        </div>
      </dl>

      <section aria-labelledby={`project-preview-${project.id}-counts`} className="project-preview__counts">
        <h4 id={`project-preview-${project.id}-counts`}>Contenu et validation</h4>
        <ul>
          <li><strong>{project.missions.length}</strong><span>Mission{project.missions.length > 1 ? "s" : ""}</span></li>
          <li><strong>{completedTasks}/{tasks.length}</strong><span>Activités terminées</span></li>
          <li><strong>{verifiedCheckpoints}/{checkpoints.length}</strong><span>Checkpoints vérifiés</span></li>
          <li><strong>{passedGates}/{gates.length}</strong><span>Gates satisfaites</span></li>
          <li className={blockedTasks ? "project-preview__count--warning" : undefined}>
            <strong>{blockedTasks}</strong><span>Blocage{blockedTasks > 1 ? "s" : ""}</span>
          </li>
        </ul>
      </section>

      <section aria-labelledby={`project-preview-${project.id}-missions`} className="project-preview__missions">
        <h4 id={`project-preview-${project.id}-missions`}>Missions</h4>
        {project.missions.length ? (
          <ol>
            {project.missions.map((mission) => (
              <li key={mission.id}>
                <div>
                  <strong>{mission.title}</strong>
                  <p>{mission.expectedOutcome}</p>
                </div>
                <span>{mission.tasks.length} activité{mission.tasks.length > 1 ? "s" : ""}</span>
              </li>
            ))}
          </ol>
        ) : <p className="panel-empty-state">Aucune mission définie.</p>}
      </section>
    </article>
  );
}

export default ProjectPreview;
