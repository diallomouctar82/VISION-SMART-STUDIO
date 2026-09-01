"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import ProgressBar from "@/components/ProgressBar";
import {
  MAX_BLOCKER_FIELD_LENGTH,
  MAX_GATE_EVIDENCE_LENGTH,
  MAX_GATE_REASON_LENGTH,
  MAX_MISSION_OUTCOME_LENGTH,
  MAX_MISSION_TITLE_LENGTH,
  MAX_TASK_LABEL_LENGTH,
} from "@/lib/studio-service";
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
  onSelectMission?: (missionId: string) => void | Promise<void>;
  onCreateMission?: (title: string, expectedOutcome: string) => void | Promise<void>;
  onCreateTask?: (missionId: string, label: string) => void | Promise<void>;
  onBlockTask?: (
    missionId: string,
    taskId: string,
    blocker: { reason: string; requiredAction: string; resumeCondition: string },
  ) => void | Promise<void>;
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
  ) => void | Promise<void>;
  onRequestTaskCompletion?: (missionId: string, taskId: string) => void;
  onClearTaskBlocker?: (missionId: string, taskId: string) => void | Promise<void>;
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

function comparableLabel(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("fr-FR");
}

function limitCodePoints(value: string, maximum: number): string {
  const characters = Array.from(value);
  return characters.length <= maximum ? value : characters.slice(0, maximum).join("");
}

function submissionError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function MissionCreationForm({
  existingTitles,
  onCreateMission,
}: {
  existingTitles: readonly string[];
  onCreateMission: NonNullable<MissionPanelProps["onCreateMission"]>;
}) {
  const titleId = useId();
  const outcomeId = useId();
  const errorId = useId();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const submitRef = useRef(false);
  const [title, setTitle] = useState("");
  const [outcome, setOutcome] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleInvalid = Boolean(
    error
    && (!title.trim() || error.startsWith("Une mission porte déjà")),
  );
  const outcomeInvalid = Boolean(error && !outcome.trim());

  function resetAndClose() {
    setTitle("");
    setOutcome("");
    setError(null);
    if (detailsRef.current) detailsRef.current.open = false;
    detailsRef.current?.querySelector("summary")?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitRef.current) return;
    const normalizedTitle = title.trim();
    const normalizedOutcome = outcome.trim();
    if (!normalizedTitle || !normalizedOutcome) {
      setError("Le titre et le résultat attendu sont obligatoires.");
      return;
    }
    if (existingTitles.some((item) => comparableLabel(item) === comparableLabel(normalizedTitle))) {
      setError("Une mission porte déjà ce titre dans le projet.");
      return;
    }

    submitRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      await onCreateMission(normalizedTitle, normalizedOutcome);
      resetAndClose();
    } catch (caught) {
      setError(submissionError(caught, "La mission n’a pas pu être créée. Réessaie."));
    } finally {
      submitRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <details className="creation-disclosure" ref={detailsRef}>
      <summary>Nouvelle mission</summary>
      <form aria-busy={isSubmitting} className="inline-creation-form" noValidate onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor={titleId}>Titre</label>
          <input
            aria-describedby={titleInvalid ? errorId : undefined}
            aria-invalid={titleInvalid ? "true" : undefined}
            disabled={isSubmitting}
            id={titleId}
            onChange={(event) => {
              setTitle(limitCodePoints(event.target.value, MAX_MISSION_TITLE_LENGTH));
              setError(null);
            }}
            required
            value={title}
          />
        </div>
        <div className="form-field">
          <label htmlFor={outcomeId}>Résultat attendu</label>
          <textarea
            aria-describedby={outcomeInvalid ? errorId : undefined}
            aria-invalid={outcomeInvalid ? "true" : undefined}
            disabled={isSubmitting}
            id={outcomeId}
            onChange={(event) => {
              setOutcome(limitCodePoints(event.target.value, MAX_MISSION_OUTCOME_LENGTH));
              setError(null);
            }}
            required
            rows={2}
            value={outcome}
          />
        </div>
        {error ? <p className="field-error" id={errorId} role="alert">{error}</p> : null}
        <div className="inline-creation-form__actions">
          <button className="secondary-button" disabled={isSubmitting} onClick={resetAndClose} type="button">
            Annuler
          </button>
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Création…" : "Créer la mission"}
          </button>
        </div>
      </form>
    </details>
  );
}

function TaskCreationForm({
  existingLabels,
  missionId,
  onCreateTask,
}: {
  existingLabels: readonly string[];
  missionId: string;
  onCreateTask: NonNullable<MissionPanelProps["onCreateTask"]>;
}) {
  const fieldId = useId();
  const errorId = useId();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const submitRef = useRef(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetAndClose() {
    setLabel("");
    setError(null);
    if (detailsRef.current) detailsRef.current.open = false;
    detailsRef.current?.querySelector("summary")?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitRef.current) return;
    const normalizedLabel = label.trim();
    if (!normalizedLabel) {
      setError("Saisis un libellé d’activité.");
      return;
    }
    if (existingLabels.some((item) => comparableLabel(item) === comparableLabel(normalizedLabel))) {
      setError("Une activité porte déjà ce libellé dans la mission.");
      return;
    }

    submitRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      await onCreateTask(missionId, normalizedLabel);
      resetAndClose();
    } catch (caught) {
      setError(submissionError(caught, "L’activité n’a pas pu être créée. Réessaie."));
    } finally {
      submitRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <details className="creation-disclosure creation-disclosure--task" ref={detailsRef}>
      <summary>Ajouter une activité</summary>
      <form aria-busy={isSubmitting} className="inline-creation-form" noValidate onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor={fieldId}>Libellé de l’activité</label>
          <input
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? "true" : undefined}
            disabled={isSubmitting}
            id={fieldId}
            onChange={(event) => {
              setLabel(limitCodePoints(event.target.value, MAX_TASK_LABEL_LENGTH));
              setError(null);
            }}
            required
            value={label}
          />
        </div>
        {error ? <p className="field-error" id={errorId} role="alert">{error}</p> : null}
        <div className="inline-creation-form__actions">
          <button className="secondary-button" disabled={isSubmitting} onClick={resetAndClose} type="button">
            Annuler
          </button>
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Ajout…" : "Ajouter l’activité"}
          </button>
        </div>
      </form>
    </details>
  );
}

function BlockerCreationForm({
  missionId,
  onBlockTask,
  task,
}: {
  missionId: string;
  onBlockTask: NonNullable<MissionPanelProps["onBlockTask"]>;
  task: StudioTaskV3;
}) {
  const reasonId = useId();
  const actionId = useId();
  const resumeId = useId();
  const errorId = useId();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const submitRef = useRef(false);
  const [reason, setReason] = useState("");
  const [requiredAction, setRequiredAction] = useState("");
  const [resumeCondition, setResumeCondition] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reasonInvalid = Boolean(error && !reason.trim());
  const actionInvalid = Boolean(error && !requiredAction.trim());
  const resumeInvalid = Boolean(error && !resumeCondition.trim());

  function resetAndClose() {
    setReason("");
    setRequiredAction("");
    setResumeCondition("");
    setError(null);
    if (detailsRef.current) detailsRef.current.open = false;
    detailsRef.current?.querySelector("summary")?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitRef.current) return;
    const normalized = {
      reason: reason.trim(),
      requiredAction: requiredAction.trim(),
      resumeCondition: resumeCondition.trim(),
    };
    if (!normalized.reason || !normalized.requiredAction || !normalized.resumeCondition) {
      setError("Renseigne la cause, l’action requise et la condition de reprise.");
      return;
    }

    submitRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      await onBlockTask(missionId, task.id, normalized);
      resetAndClose();
    } catch (caught) {
      setError(submissionError(caught, "Le blocage n’a pas pu être déclaré. Réessaie."));
    } finally {
      submitRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <details className="creation-disclosure creation-disclosure--blocker" ref={detailsRef}>
      <summary>Déclarer un blocage</summary>
      <form aria-busy={isSubmitting} className="inline-creation-form" noValidate onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor={reasonId}>Cause du blocage</label>
          <textarea
            aria-describedby={reasonInvalid ? errorId : undefined}
            aria-invalid={reasonInvalid ? "true" : undefined}
            disabled={isSubmitting}
            id={reasonId}
            onChange={(event) => {
              setReason(limitCodePoints(event.target.value, MAX_BLOCKER_FIELD_LENGTH));
              setError(null);
            }}
            required
            rows={2}
            value={reason}
          />
        </div>
        <div className="form-field">
          <label htmlFor={actionId}>Action requise</label>
          <textarea
            aria-describedby={actionInvalid ? errorId : undefined}
            aria-invalid={actionInvalid ? "true" : undefined}
            disabled={isSubmitting}
            id={actionId}
            onChange={(event) => {
              setRequiredAction(limitCodePoints(event.target.value, MAX_BLOCKER_FIELD_LENGTH));
              setError(null);
            }}
            required
            rows={2}
            value={requiredAction}
          />
        </div>
        <div className="form-field">
          <label htmlFor={resumeId}>Condition de reprise</label>
          <textarea
            aria-describedby={resumeInvalid ? errorId : undefined}
            aria-invalid={resumeInvalid ? "true" : undefined}
            disabled={isSubmitting}
            id={resumeId}
            onChange={(event) => {
              setResumeCondition(limitCodePoints(event.target.value, MAX_BLOCKER_FIELD_LENGTH));
              setError(null);
            }}
            required
            rows={2}
            value={resumeCondition}
          />
        </div>
        {error ? <p className="field-error" id={errorId} role="alert">{error}</p> : null}
        <div className="inline-creation-form__actions">
          <button className="secondary-button" disabled={isSubmitting} onClick={resetAndClose} type="button">
            Annuler
          </button>
          <button className="danger-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Déclaration…" : "Déclarer le blocage"}
          </button>
        </div>
      </form>
    </details>
  );
}

function GateControl({
  gate,
  missionId,
  taskLabel,
  taskId,
  onSetGateStatus,
}: {
  gate: StudioValidationGate;
  missionId: string;
  taskLabel: string;
  taskId: string;
  onSetGateStatus?: MissionPanelProps["onSetGateStatus"];
}) {
  const statusId = useId();
  const evidenceId = useId();
  const reasonId = useId();
  const [selectedStatus, setSelectedStatus] = useState<StudioValidationGate["status"]>(gate.status);
  const [evidence, setEvidence] = useState(gate.evidence ?? "");
  const [reason, setReason] = useState(gate.reason ?? "");
  const submitRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const requiresEvidence = selectedStatus === "passed";
  const requiresReason = selectedStatus === "failed" || selectedStatus === "not_applicable";
  const isUnchanged = selectedStatus === gate.status
    && (requiresEvidence ? evidence.trim() === (gate.evidence ?? "") : true)
    && (requiresReason ? reason.trim() === (gate.reason ?? "") : true);
  const updateDisabled = !onSetGateStatus
    || isSubmitting
    || isUnchanged
    || (requiresEvidence && !evidence.trim())
    || (requiresReason && !reason.trim());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (updateDisabled || !onSetGateStatus || submitRef.current) return;

    submitRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSetGateStatus(missionId, taskId, gate.id, {
        status: selectedStatus,
        checkedAt: selectedStatus === "pending" ? null : new Date().toISOString(),
        evidence: requiresEvidence ? evidence.trim() : null,
        reason: requiresReason ? reason.trim() : null,
      });
    } catch (error) {
      setSubmitError(submissionError(error, "Le résultat du gate n’a pas pu être enregistré."));
    } finally {
      submitRef.current = false;
      setIsSubmitting(false);
    }
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
              disabled={isSubmitting}
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
                disabled={isSubmitting}
                id={evidenceId}
                onChange={(event) => setEvidence(
                  limitCodePoints(event.target.value, MAX_GATE_EVIDENCE_LENGTH),
                )}
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
                disabled={isSubmitting}
                id={reasonId}
                onChange={(event) => setReason(
                  limitCodePoints(event.target.value, MAX_GATE_REASON_LENGTH),
                )}
                placeholder="Cause de l’échec ou justification de non-applicabilité"
                rows={2}
                value={reason}
              />
            </div>
          ) : null}
          {submitError ? <p className="field-error" role="alert">{submitError}</p> : null}
          <button
            aria-label={`Appliquer le résultat ${gate.label} à l’activité ${taskLabel}`}
            className="secondary-button"
            disabled={updateDisabled}
            type="submit"
          >
            {isSubmitting ? "Application…" : "Appliquer"}
          </button>
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
  onBlockTask,
  onClearTaskBlocker,
}: {
  missionId: string;
  task: StudioTaskV3;
  onToggleCheckpoint?: MissionPanelProps["onToggleCheckpoint"];
  onSetGateStatus?: MissionPanelProps["onSetGateStatus"];
  onRequestTaskCompletion?: MissionPanelProps["onRequestTaskCompletion"];
  onBlockTask?: MissionPanelProps["onBlockTask"];
  onClearTaskBlocker?: MissionPanelProps["onClearTaskBlocker"];
}) {
  const progress = taskProgress(task);
  const gatesPass = requiredGatesPass(task);
  const canComplete = canMarkTaskDone(task);
  const detailsId = useId();
  const clearBlockerRef = useRef(false);
  const [isClearingBlocker, setIsClearingBlocker] = useState(false);
  const [clearBlockerError, setClearBlockerError] = useState<string | null>(null);

  async function clearBlocker() {
    if (!onClearTaskBlocker || clearBlockerRef.current) return;
    clearBlockerRef.current = true;
    setIsClearingBlocker(true);
    setClearBlockerError(null);
    try {
      await onClearTaskBlocker(missionId, task.id);
    } catch (error) {
      setClearBlockerError(submissionError(error, "Le blocage n’a pas pu être levé. Réessaie."));
    } finally {
      clearBlockerRef.current = false;
      setIsClearingBlocker(false);
    }
  }

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
              aria-label={`Signaler le blocage résolu pour l’activité ${task.label}`}
              className="secondary-button"
              disabled={isClearingBlocker}
              onClick={clearBlocker}
              type="button"
            >
              {isClearingBlocker ? "Enregistrement…" : "Signaler le blocage résolu"}
            </button>
          ) : null}
          {clearBlockerError ? <p className="field-error" role="alert">{clearBlockerError}</p> : null}
        </section>
      ) : null}

      {!task.blocker && task.status !== "done" && onBlockTask ? (
        <BlockerCreationForm missionId={missionId} onBlockTask={onBlockTask} task={task} />
      ) : null}

      <details className="task-details">
        <summary aria-label={`Contrôles de l’activité ${task.label}`}>
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
                    taskLabel={task.label}
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
          aria-label={canComplete
            ? `Marquer l’activité ${task.label} terminée`
            : `Validation requise avant de clôturer l’activité ${task.label}`}
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
  onCreateMission,
  onCreateTask,
  onToggleCheckpoint,
  onSetGateStatus,
  onRequestTaskCompletion,
  onBlockTask,
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

      {project && onCreateMission && project.status !== "completed" ? (
        <MissionCreationForm
          existingTitles={project.missions.map((mission) => mission.title)}
          onCreateMission={onCreateMission}
        />
      ) : null}

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
              {onCreateTask && project.status !== "completed" ? (
                <TaskCreationForm
                  existingLabels={activeMission.tasks.map((task) => task.label)}
                  missionId={activeMission.id}
                  onCreateTask={onCreateTask}
                />
              ) : null}
              <div className="mission-task-list">
                {activeMission.tasks.length ? activeMission.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    missionId={activeMission.id}
                    onBlockTask={onBlockTask}
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
