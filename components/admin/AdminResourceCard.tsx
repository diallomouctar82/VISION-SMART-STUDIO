"use client";

import type { ReactNode } from "react";

type ResourceCardProps = {
  title: string;
  kind: string;
  description?: string | null;
  environment?: string | null;
  desiredState?: string | null;
  observedState?: string | null;
  healthStatus?: string | null;
  meta?: ReactNode;
  actions?: ReactNode;
};

function statusTone(status: string | null | undefined): string {
  if (!status) return "neutral";
  if (["healthy", "active", "ready", "succeeded", "enabled", "verified"].includes(status)) return "success";
  if (["failed", "unhealthy", "error", "disabled", "revoked"].includes(status)) return "danger";
  if (["pending", "unknown", "degraded", "maintenance", "installing", "queued", "processing"].includes(status)) return "warning";
  return "neutral";
}

export function AdminResourceCard({
  title,
  kind,
  description,
  environment,
  desiredState,
  observedState,
  healthStatus,
  meta,
  actions,
}: ResourceCardProps) {
  return (
    <article className="admin-resource-card">
      <header className="admin-resource-card__header">
        <div>
          <p className="admin-resource-card__kind">{kind}</p>
          <h3>{title}</h3>
        </div>
        {healthStatus ? (
          <span className={`admin-status admin-status--${statusTone(healthStatus)}`}>{healthStatus}</span>
        ) : null}
      </header>

      {description ? <p className="admin-resource-card__description">{description}</p> : null}

      {(environment || desiredState || observedState) ? (
        <dl className="admin-resource-card__states">
          {environment ? <div><dt>Environnement</dt><dd>{environment}</dd></div> : null}
          {desiredState ? <div><dt>État demandé</dt><dd>{desiredState}</dd></div> : null}
          {observedState ? <div><dt>État observé</dt><dd>{observedState}</dd></div> : null}
        </dl>
      ) : null}

      {meta ? <div className="admin-resource-card__meta">{meta}</div> : null}
      {actions ? <footer className="admin-resource-card__actions">{actions}</footer> : null}
    </article>
  );
}

