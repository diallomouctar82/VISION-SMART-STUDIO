const projects = ["Vision Smart Studio", "Moknet", "GestionVS"];
const tasks = [
  { label: "Fondations", status: "Terminé", progress: 100 },
  { label: "Workspace visuel", status: "En cours", progress: 35 },
  { label: "Moteur de tâches", status: "À faire", progress: 0 },
];

export default function HomePage() {
  return (
    <main className="studio-shell">
      <aside className="panel sidebar">
        <div>
          <p className="eyebrow">VISION SMART</p>
          <h1>Studio</h1>
        </div>
        <button className="primary-button">+ Nouveau projet</button>
        <section>
          <h2>Projets</h2>
          <div className="stack">
            {projects.map((project, index) => (
              <button className={index === 0 ? "project active" : "project"} key={project}>
                <span className="project-dot" />
                {project}
              </button>
            ))}
          </div>
        </section>
        <section className="sidebar-footer">
          <span className="status-dot" /> Infrastructure prête à connecter
        </section>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">PROJET ACTIF</p>
            <h2>Vision Smart Studio</h2>
          </div>
          <div className="model-pill">Sélection modèle · Intelligent</div>
        </header>

        <div className="conversation">
          <div className="hero-card">
            <span className="hero-icon">✦</span>
            <h3>De l’idée au résultat.</h3>
            <p>
              Décris ton objectif naturellement. L’équipe IA structure le besoin, prépare l’architecture,
              exécute les missions et conduit le projet jusqu’à une livraison validée.
            </p>
          </div>
          <div className="message assistant-message">
            <strong>Vision Smart Studio</strong>
            <p>Je suis prêt. Quel résultat veux-tu construire aujourd’hui ?</p>
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
          <strong>35%</strong>
        </div>
        <div className="progress-track"><div className="progress-fill" /></div>
        <div className="stack task-list">
          {tasks.map((task) => (
            <article className="task-card" key={task.label}>
              <div className="task-line">
                <strong>{task.label}</strong>
                <span>{task.progress}%</span>
              </div>
              <p>{task.status}</p>
              <div className="mini-track"><div className="mini-fill" style={{ width: `${task.progress}%` }} /></div>
            </article>
          ))}
        </div>
        <div className="validation-card">
          <p className="eyebrow">VALIDATION</p>
          <strong>Phase 1</strong>
          <p>Architecture → Exécution → Test → Correction → Validation</p>
        </div>
      </aside>
    </main>
  );
}
