"use client";

import type { ReactNode } from "react";
import type { SpecificationSession } from "@/lib/ai-core-specification";
import styles from "./ProjectDefinitionPanel.module.css";

function humanize(key: string): string {
  return key.replace(/_/g, " ").replace(/^./, (value) => value.toUpperCase());
}

function renderValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <span>{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (!value.length) return null;
    return (
      <ul>
        {value.map((item, index) => <li key={index}>{renderValue(item)}</li>)}
      </ul>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== null && item !== undefined);
    if (!entries.length) return null;
    return (
      <dl>
        {entries.map(([key, item]) => (
          <div key={key}>
            <dt>{humanize(key)}</dt>
            <dd>{renderValue(item)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return null;
}

function artifactTitle(artifact: Record<string, unknown>): string {
  const explicit = artifact.title;
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  const type = artifact.type;
  if (typeof type !== "string") return "Artefact AI Core";
  const names: Record<string, string> = {
    spec: "Spécification proposée",
    plan: "Plan / architecture proposés",
    tasks: "Tâches proposées",
    analysis: "Analyse proposée",
  };
  return names[type] ?? humanize(type);
}

export default function ProjectDefinitionPanel({ session }: { session: SpecificationSession | null }) {
  if (!session) return null;

  const artifacts = session.artifacts ?? [];
  const hasDefinition = Boolean(
    session.validatedIntent
    || session.planSummary
    || session.tasks?.length
    || artifacts.length
    || session.convergence,
  );
  if (!hasDefinition) return null;

  return (
    <section className={styles.panel} aria-label="Définition du projet issue d’AI Core">
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">PHASE 2 · DÉFINITION DU PROJET</p>
          <h3>Artefacts réellement renvoyés par AI Core</h3>
        </div>
        <span className={styles.stage}>{session.stage}</span>
      </div>
      <p className={styles.note}>
        Ces éléments viennent de la session AI Core courante. Un artefact <strong>PROPOSED</strong> reste une proposition :
        il ne vaut ni validation, ni exécution, ni convergence.
      </p>

      {session.validatedIntent ? (
        <article className={`${styles.card} ${styles.authority}`}>
          <div className={styles.cardTitle}><strong>Intention validée</strong><span>AI Core</span></div>
          {renderValue(session.validatedIntent)}
        </article>
      ) : null}

      {session.planSummary ? (
        <article className={styles.card}>
          <div className={styles.cardTitle}><strong>Plan / architecture</strong><span>SESSION</span></div>
          {renderValue(session.planSummary)}
        </article>
      ) : null}

      {artifacts.length ? (
        <div className={styles.grid}>
          {artifacts.map((artifact, index) => (
            <article className={styles.card} key={`${String(artifact.type ?? "artifact")}-${index}`}>
              <div className={styles.cardTitle}>
                <strong>{artifactTitle(artifact)}</strong>
                <span>{String(artifact.status ?? "AI CORE")}</span>
              </div>
              {renderValue(artifact.content)}
            </article>
          ))}
        </div>
      ) : null}

      {session.tasks?.length ? (
        <article className={styles.card}>
          <div className={styles.cardTitle}><strong>Tâches structurées</strong><span>{session.tasks.length}</span></div>
          {renderValue(session.tasks)}
        </article>
      ) : null}

      {session.convergence ? (
        <article className={`${styles.card} ${styles.authority}`}>
          <div className={styles.cardTitle}><strong>Convergence prouvée</strong><span>GOUVERNÉ</span></div>
          {renderValue(session.convergence)}
        </article>
      ) : null}
    </section>
  );
}
