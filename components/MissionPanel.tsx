"use client";

import { useId, useMemo, useState } from "react";
import type { FormEvent } from "react";
import ProgressBar from "@/components/ProgressBar";
import {
  canMarkTaskDone,
  missionProgress,
  projectProgress,
  requiredGatesPass,
  taskProgress,
} from "@/lib/studio-progress";
import type {
  StudioProjectV3,
  StudioTaskV3,
  StudioValidationGate,
} from "@/lib/studio-types";

export type GateStatusUpdate = Pick<
  StudioValidationGate,
  "status" | "checkedAt" | "evidence" | "reason"
>;

export type MissionPanelProps = {
  project: StudioProjectV3 | null;
  activeMissionId?: string | null;
  onSelectMission?: (missionId: string) => void;
  onToggleCheckpoint?: (
    missionId: string,
    taskId: string,
    checkpointId: string,
    verified: boolean,
  ) => void;
  onSetGateStatus?: (
    missionId: string,
    taskId: string,
    gateId: string,
    update: GateStatusUpdate,
  ) => void;
  onRequestTaskCompletion?: (missionId: string, taskId: string) => void;
  onClearTaskBlocker?: (missionId: string, taskId: string) => void;
};

const taskStatusLabel: Record<StudioTaskV3["status"], string> = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Terminé",
  blocked: "Bloqué",
};

const gateStatusLabel: Record<StudioValidationGate["status"], string> = {
  pending: "À contrôler",
  passed: "Validé",
  failed: "Échec",
  not_applicable: "Non applicable",
};

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : `${dateTimeFormatter.format(date)} UTC`;
}

function progressTone(task: StudioTaskV3) {
  if (task.gates.some((gate) => gate.status === "failed")) return "danger" as const;
  if (task.status === "blocked") return "warning" as const;
  if (taskProgress(task) === 100) return "success" as const;
  return "default" as const;
}

function GateControl({
  gate,
  missionId,
  taskId,
  onSetGateStatus,
}: {
  gate: StudioValidationGate;
  missionId: string;
  taskId: string;
  onSetGateStatus?: MissionPanelProps["onSetGateStatus"];
}) {
  const statusId = useId();
  const evidenceId = useId();
  const reasonId = useId();
  const [selectedStatus, setSelectedStatus] = useState<StudioValidationGate["status"]>(gate.status);
  const [evidence, setEvidence] = useState(gate.evidence ?? "");
  const [reason, setReason] = useState(gate.reason ?? "");

  const requiresEvidence = selectedStatus === "passed";
  const requiresReason = selectedStatus === "failed" || selectedStatus === "not_applicable";
  const updateDisabled = !onSetGateStatus
    || (requiresEvidence && !evidence.trim())
    || (requiresReason && !reason.trim());

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (updateDisabled || !onSetGateStatus) return;

    onSetGateStatus(missionId, taskId, gate.id, {
      status: selectedStatus,
      checkedAt: selectedStatus === "pending" ? null : new Date().toISOString(),
      evidence: requiresEvidence ? evidence.trim() : null,
      reason: requiresReason ? reason.trim() : null,
    });
  }

  return (
    <li className={`gate-card gate-card--${gate.status}`}>
      <div className="gate-card__heading">
        <div>
          <strong>{gate.label}</strong>
          <span>{gate.required ? "Obligatoire" : "Optionnel"}</span>
        </div>
        <span className="status-badge">{gateStatusLabel[gate.status]}</span>
      </div>
      {gate.checkedAt ? (
        <p className="gate-card__meta">
          Contrôlé le <time dateTime={gate.checkedAt}>{formatTimestamp(gate.checkedAt)}</time>
        </p>
      ) : null}
      {gate.evidence ? <p className="gate-card__note"><strong>Preuve :</strong> {gate.evidence}</p> : null}
      {gate.reason ? <p className="gate-card__note"><strong>Motif :</strong> {gate.reason}</p> : null}
      {onSetGateStatus ? (
        <form className="gate-form" onSubmit={handleSubmit}>
          <div className="gate-form__field">
            <label htmlFor={statusId}>Résultat</label>
            <select
              id={statusId}
              onChange={(event) => setSelectedStatus(event.target.value as StudioValidationGate["status"])}
              value={selectedStatus}
            >
              <option value="pending">À contrôler</option>
              <option value="passed">Validé</option>
              <option value="failed">Échec</option>
              <option value="not_applicable">Non applicable</option>
            </select>
          </div>
          {requiresEvidence ? (
            <div className="gate-form__field gate-form__field--note">
              <label htmlFor={evidenceId}>Preuve (obligatoire)</label>
              <textarea
                id={evidenceId}
                onChange={(event) => setEvidence(event.target.value)}
                placeholder="Test, capture, commit ou autre preuve vérifiable"
                rows={2}
                value={evidence}
              />
            </div>
          ) : null}
          {requiresReason ? (
            <div className="gate-form__field gate-form__field--note">
              <label htmlFor={reasonId}>Motif (obligatoire)</label>
              <textarea
                id={reasonId}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Cause de l’échec ou justification de non-applicabilité"
                rows={2}
                value={reason}
              />
            </div>
          ) : null}
          <button className="secondary-button" disabled={updateDisabled} type="submit">Appliquer</button>
        </form>
      ) : null}
    </li>
  );
}

function TaskCard({
  missionId,
  task,
  onToggleCheckpoint,
  onSetGateStatus,
  onRequestTaskCompletion,
  onClearTaskBlocker,
}: {
  missionId: string;
  task: StudioTaskV3;
  onToggleCheckpoint?: MissionPanelProps["onToggleCheckpoint"];
  onSetGateStatus?: MissionPanelProps["onSetGateStatus"];
  onRequestTaskCompletion?: MissionPanelProps["onRequestTaskCompletion"];
  onClearTaskBlocker?: MissionPanelProps["onClearTaskBlocker"];
}) {
  const progress = taskProgress(task);
  const gatesPass = requiredGatesPass(task);
  const canComplete = canMarkTaskDone(task);
  const detailsId = useId();

  return (
    <article className={`mission-task mission-task--${task.status}`}>
      <header className="mission-task__header">
        <div>
          <p className="task-status">{taskStatusLabel[task.status]}</p>
          <h4>{task.label}</h4>
        </div>
        <strong aria-label={`Progression ${progress} %`}>{progress}%</strong>
      </header>
      <ProgressBar compact label={`Progression validée de la tâche ${task.label}`} tone={progressTone(task)} value={progress} />
      <p className="task-weight">Poids dans la mission : {task.weight}</p>

      {task.legacy ? (
        <p className="legacy-warning" role="note">
          Ancienne valeur déclarée : {task.legacy.reportedProgress}% ({task.legacy.reportedStatus}).
          Elle ne constitue pas une preuve de validation.
        </p>
      ) : null}

      {task.blocker ? (
        <section aria-labelledby={`${detailsId}-blocker`} className="blocker-card">
          <div className="blocker-card__heading">
            <h5 id={`${detailsId}-blocker`}>Blocage déclaré</h5>
            <time dateTime={task.blocker.blockedAt}>{formatTimestamp(task.blocker.blockedAt)}</time>
          </div>
          <dl>
            <div><dt>Cause</dt><dd>{task.blocker.reason}</dd></div>
            <div><dt>Action requise</dt><dd>{task.blocker.requiredAction}</dd></div>
            <div><dt>Condition de reprise</dt><dd>{task.blocker.resumeCondition}</dd></div>
          </dl>
          {onClearTaskBlocker ? (
            <button
              className="secondary-button"
              onClick={() => onClearTaskBlocker(missionId, task.id)}
              type="button"
            >
              Signaler le blocage résolu
            </button>
          ) : null}
        </section>
      ) : null}

      <details className="task-details">
        <summary>
          Contrôles de la tâche
          <span>{task.checkpoints.filter((checkpoint) => checkpoint.verified).length}/{task.checkpoints.length} checkpoints</span>
        </summary>
        <div className="task-details__content">
          <section aria-labelledby={`${detailsId}-checkpoints`}>
            <h5 id={`${detailsId}-checkpoints`}>Checkpoints vérifiés</h5>
            {task.checkpoints.length ? (
              <ul className="checkpoint-list">
                {task.checkpoints.map((checkpoint) => (
                  <li key={checkpoint.id}>
                    <label className="checkpoint-item">
                      <input
                        checked={checkpoint.verified}
                        disabled={!onToggleCheckpoint || task.status === "blocked"}
                        onChange={(event) => onToggleCheckpoint?.(
                          missionId,
                          task.id,
                          checkpoint.id,
                          event.target.checked,
                        )}
                        type="checkbox"
                      />
                      <span>
                        <strong>{checkpoint.label}</strong>
                        <small>
                          Poids {checkpoint.weight}
                          {checkpoint.verifiedAt ? ` · vérifié le ${formatTimestamp(checkpoint.verifiedAt)}` : ""}
                        </small>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="panel-empty-state">Aucun checkpoint défini.</p>
            )}
          </section>

          <section aria-labelledby={`${detailsId}-gates`}>
            <div className="subsection-heading">
              <h5 id={`${detailsId}-gates`}>Gates de validation</h5>
              <span className={gatesPass ? "gate-summary gate-summary--passed" : "gate-summary"}>
                {gatesPass ? "Gates obligatoires validées" : "Validation obligatoire incomplète"}
              </span>
            </div>
            {task.gates.length ? (
              <ul className="gate-list">
                {task.gates.map((gate) => (
                  <GateControl
                    gate={gate}
                    key={`${gate.id}:${gate.status}:${gate.checkedAt ?? ""}:${gate.evidence ?? ""}:${gate.reason ?? ""}`}
                    missionId={missionId}
                    onSetGateStatus={onSetGateStatus}
                    taskId={task.id}
                  />
                ))}
              </ul>
            ) : (
              <p className="panel-empty-state">Aucun gate défini.</p>
            )}
          </section>
        </div>
      </details>

      {onRequestTaskCompletion && task.status !== "done" && task.status !== "blocked" ? (
        <button
          className="task-complete-button"
          disabled={!canComplete}
          onClick={() => onRequestTaskCompletion(missionId, task.id)}
          type="button"
        >
          {canComplete ? "Marquer la tâche terminée" : "Validation requise avant clôture"}
        </button>
      ) : null}
    </article>
  );
}

export function MissionPanel({
  project,
  activeMissionId,
  onSelectMission,
  onToggleCheckpoint,
  onSetGateStatus,
  onRequestTaskCompletion,
  onClearTaskBlocker,
}: MissionPanelProps) {
  const selectedMissionId = activeMissionId ?? project?.activeMissionId ?? project?.missions[0]?.id ?? null;
  const activeMission = useMemo(
    () => project?.missions.find((mission) => mission.id === selectedMissionId) ?? project?.missions[0] ?? null,
    [project, selectedMissionId],
  );
  const totalProgress = project ? projectProgress(project) : 0;

  return (
    <aside aria-labelledby="mission-panel-title" className="studio-panel mission-panel">
      <header className="mission-panel__header">
        <div>
          <p className="eyebrow">PROJET</p>
          <h2 id="mission-panel-title">Progression validée</h2>
        </div>
        <strong>{totalProgress}%</strong>
      </header>
      <ProgressBar label="Progression validée du projet" value={totalProgress} />

      {project?.missions.length ? (
        <>
          <nav aria-label="Missions du projet" className="mission-selector">
            <h3>Missions</h3>
            <ul>
              {project.missions.map((mission) => {
                const progress = missionProgress(mission);
                const isActive = mission.id === activeMission?.id;
                return (
                  <li key={mission.id}>
                    <button
                      aria-current={isActive ? "true" : undefined}
                      className={isActive ? "mission-selector__button is-active" : "mission-selector__button"}
                      disabled={!onSelectMission}
                      onClick={() => onSelectMission?.(mission.id)}
                      type="button"
                    >
                      <span>{mission.title}</span>
                      <strong>{progress}%</strong>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {activeMission ? (
            <section aria-labelledby="active-mission-title" className="active-mission">
              <header className="active-mission__header">
                <div>
                  <p className="eyebrow">MISSION SÉLECTIONNÉE</p>
                  <h3 id="active-mission-title">{activeMission.title}</h3>
                </div>
                <strong>{missionProgress(activeMission)}%</strong>
              </header>
              <p className="mission-outcome">{activeMission.expectedOutcome}</p>
              <div className="mission-task-list">
                {activeMission.tasks.length ? activeMission.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    missionId={activeMission.id}
                    onClearTaskBlocker={onClearTaskBlocker}
                    onRequestTaskCompletion={onRequestTaskCompletion}
                    onSetGateStatus={onSetGateStatus}
                    onToggleCheckpoint={onToggleCheckpoint}
                    task={task}
                  />
                )) : <p className="panel-empty-state">Aucune tâche définie pour cette mission.</p>}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <p className="panel-empty-state mission-panel__empty">Aucune mission définie pour ce projet.</p>
      )}
    </aside>
  );
}

export default MissionPanel;
