"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import {
  MAX_INITIAL_ACTIVITY_COUNT,
  MAX_MISSION_OUTCOME_LENGTH,
  MAX_MISSION_TITLE_LENGTH,
  MAX_PROJECT_DESCRIPTION_LENGTH,
  MAX_PROJECT_NAME_LENGTH,
  MAX_PROJECT_OUTCOME_LENGTH,
  MAX_REPOSITORY_URL_LENGTH,
  MAX_TASK_LABEL_LENGTH,
} from "@/lib/studio-store";
import type { ProjectEnvironment, ProjectStatus } from "@/lib/studio-types";

export type ProjectLifecycleStatus = ProjectStatus;

export type ProjectTargetEnvironment = ProjectEnvironment;

export type ProjectSettingsValues = {
  name: string;
  description: string;
  expectedOutcome: string;
  status: ProjectLifecycleStatus;
  environment: ProjectTargetEnvironment;
  repositoryUrl: string | null;
};

export type ProjectSetupValues = ProjectSettingsValues & {
  missionTitle: string;
  missionOutcome: string;
  activityLabels: string[];
};

export type ProjectSetupDialogProps = {
  mode: "create" | "edit";
  initialValues?: Partial<ProjectSetupValues>;
  onCancel: () => void;
  onSubmit: (values: ProjectSetupValues) => void | Promise<void>;
};

type ActivityField = {
  key: number;
  value: string;
};

type ValidationErrors = Record<string, string>;

const DEFAULT_VALUES: ProjectSetupValues = {
  name: "",
  description: "",
  expectedOutcome: "",
  status: "draft",
  environment: "development",
  repositoryUrl: null,
  missionTitle: "",
  missionOutcome: "",
  activityLabels: [""],
};

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const subscribeToClient = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function normalizedInitialValues(initialValues?: Partial<ProjectSetupValues>): ProjectSetupValues {
  return {
    ...DEFAULT_VALUES,
    ...initialValues,
    repositoryUrl: initialValues?.repositoryUrl ?? null,
    activityLabels: initialValues?.activityLabels?.length
      ? [...initialValues.activityLabels]
      : [...DEFAULT_VALUES.activityLabels],
  };
}

function normalizeComparableValue(value: string): string {
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

function validateActivityFields(activities: readonly ActivityField[]): ValidationErrors {
  const activityErrors: ValidationErrors = {};
  const seenLabels = new Set<string>();
  activities.forEach((activity, index) => {
    const key = `activity-${index}`;
    const normalized = normalizeComparableValue(activity.value);
    if (!normalized) {
      activityErrors[key] = "Saisis un libellé d’activité.";
    } else if (seenLabels.has(normalized)) {
      activityErrors[key] = "Chaque activité doit avoir un libellé distinct.";
    } else {
      seenLabels.add(normalized);
    }
  });
  return activityErrors;
}

function recalculateVisibleActivityErrors(
  currentErrors: ValidationErrors,
  activities: readonly ActivityField[],
): ValidationErrors {
  const nextErrors = Object.fromEntries(
    Object.entries(currentErrors).filter(([field]) => !field.startsWith("activity-")),
  );
  const hadActivityErrors = Object.keys(currentErrors).some((field) => field.startsWith("activity-"));
  return hadActivityErrors
    ? { ...nextErrors, ...validateActivityFields(activities) }
    : nextErrors;
}

function validHttpsRepository(value: string): boolean {
  try {
    const url = new URL(value);
    const hasUserInfo = value.slice("https://".length).split(/[/?#]/u, 1)[0].includes("@");
    return url.protocol === "https:"
      && Boolean(url.hostname)
      && !hasUserInfo
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

export function ProjectSetupDialog({
  mode,
  initialValues,
  onCancel,
  onSubmit,
}: ProjectSetupDialogProps) {
  const initial = useMemo(() => normalizedInitialValues(initialValues), [initialValues]);
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const descriptionId = `${dialogId}-dialog-description`;
  const formErrorId = `${dialogId}-form-error`;
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const discardDialogRef = useRef<HTMLElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const addActivityButtonRef = useRef<HTMLButtonElement>(null);
  const activityInputRefs = useRef(new Map<number, HTMLInputElement>());
  const discardContinueRef = useRef<HTMLButtonElement>(null);
  const discardReturnFocusRef = useRef<HTMLElement | null>(null);
  const activitySequenceRef = useRef(initial.activityLabels.length);
  const submittingRef = useRef(false);
  const [settings, setSettings] = useState<ProjectSettingsValues>({
    name: initial.name,
    description: initial.description,
    expectedOutcome: initial.expectedOutcome,
    status: initial.status,
    environment: initial.environment,
    repositoryUrl: initial.repositoryUrl,
  });
  const [missionTitle, setMissionTitle] = useState(initial.missionTitle);
  const [missionOutcome, setMissionOutcome] = useState(initial.missionOutcome);
  const [activities, setActivities] = useState<ActivityField[]>(() => (
    initial.activityLabels.map((value, index) => ({ key: index, value }))
  ));
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const mounted = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  );

  const currentValues = useMemo<ProjectSetupValues>(() => ({
    ...settings,
    repositoryUrl: settings.repositoryUrl?.trim() || null,
    missionTitle,
    missionOutcome,
    activityLabels: activities.map((activity) => activity.value),
  }), [activities, missionOutcome, missionTitle, settings]);
  const initialSnapshot = useMemo(() => JSON.stringify(initial), [initial]);
  const isDirty = JSON.stringify(currentValues) !== initialSnapshot;

  useEffect(() => {
    if (!mounted) return undefined;
    firstFieldRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    const backdrop = backdropRef.current;
    const backgroundElements = [...document.body.children]
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== backdrop)
      .map((element) => ({
        element,
        hadInert: element.hasAttribute("inert"),
        ariaHidden: element.getAttribute("aria-hidden"),
      }));
    backgroundElements.forEach(({ element }) => {
      element.setAttribute("inert", "");
      element.setAttribute("aria-hidden", "true");
    });
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      backgroundElements.forEach(({ element, hadInert, ariaHidden }) => {
        if (!hadInert) element.removeAttribute("inert");
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
    };
  }, [mounted]);

  useEffect(() => {
    if (!confirmDiscard) return undefined;
    const frame = requestAnimationFrame(() => {
      discardContinueRef.current?.focus();
      discardContinueRef.current?.scrollIntoView?.({ block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [confirmDiscard]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (confirmDiscard) dialog.setAttribute("inert", "");
    else dialog.removeAttribute("inert");
    return () => dialog.removeAttribute("inert");
  }, [confirmDiscard]);

  function fieldId(field: string): string {
    return `${dialogId}-${field}`;
  }

  function errorId(field: string): string {
    return `${fieldId(field)}-error`;
  }

  function describedBy(field: string, ...descriptionIds: Array<string | undefined>): string | undefined {
    const ids = [...descriptionIds, errors[field] ? errorId(field) : undefined].filter(Boolean);
    return ids.length ? ids.join(" ") : undefined;
  }

  function clearError(field: string) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setSubmitError(null);
  }

  function requestCancel() {
    if (submittingRef.current) return;
    if (isDirty) {
      discardReturnFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      setConfirmDiscard(true);
      return;
    }
    onCancel();
  }

  function continueEditing() {
    const returnTarget = discardReturnFocusRef.current;
    setConfirmDiscard(false);
    requestAnimationFrame(() => returnTarget?.focus());
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (confirmDiscard) continueEditing();
      else requestCancel();
      return;
    }

    if (event.key !== "Tab") return;
    const focusRoot = confirmDiscard ? discardDialogRef.current : dialogRef.current;
    const focusable = [...(focusRoot?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [])];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function validate(): ValidationErrors {
    const nextErrors: ValidationErrors = {};
    if (!settings.name.trim()) nextErrors.name = "Saisis un nom de projet.";
    if (!settings.description.trim()) nextErrors.description = "Décris brièvement le projet.";
    if (!settings.expectedOutcome.trim()) {
      nextErrors.expectedOutcome = "Indique le résultat attendu du projet.";
    }
    const repositoryUrl = settings.repositoryUrl?.trim() ?? "";
    if (repositoryUrl && !validHttpsRepository(repositoryUrl)) {
      nextErrors.repositoryUrl = "Utilise une URL HTTPS sans identifiant ni mot de passe.";
    }

    if (mode === "create") {
      if (!missionTitle.trim()) nextErrors.missionTitle = "Saisis le titre de la mission initiale.";
      if (!missionOutcome.trim()) nextErrors.missionOutcome = "Indique le résultat attendu de la mission.";
      Object.assign(nextErrors, validateActivityFields(activities));
    }
    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => {
        const firstErrorField = document.getElementById(fieldId(Object.keys(nextErrors)[0]));
        firstErrorField?.focus();
      });
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setConfirmDiscard(false);
    try {
      await onSubmit({
        ...settings,
        name: settings.name.trim(),
        description: settings.description.trim(),
        expectedOutcome: settings.expectedOutcome.trim(),
        repositoryUrl: settings.repositoryUrl?.trim() || null,
        missionTitle: missionTitle.trim(),
        missionOutcome: missionOutcome.trim(),
        activityLabels: activities.map((activity) => activity.value.trim()),
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error && error.message
          ? error.message
          : mode === "create"
            ? "Le projet n’a pas pu être créé. Réessaie."
            : "Les paramètres n’ont pas pu être enregistrés. Réessaie.",
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function addActivity() {
    activitySequenceRef.current += 1;
    const newActivityKey = activitySequenceRef.current;
    const nextActivities = [...activities, { key: newActivityKey, value: "" }];
    setActivities(nextActivities);
    setErrors((current) => recalculateVisibleActivityErrors(current, nextActivities));
    requestAnimationFrame(() => activityInputRefs.current.get(newActivityKey)?.focus());
  }

  function removeActivity(index: number) {
    if (activities.length === 1) return;
    const focusActivityKey = activities[index + 1]?.key ?? activities[index - 1]?.key;
    const nextActivities = activities.filter((_, currentIndex) => currentIndex !== index);
    setActivities(nextActivities);
    setErrors((current) => recalculateVisibleActivityErrors(current, nextActivities));
    requestAnimationFrame(() => {
      if (focusActivityKey === undefined) addActivityButtonRef.current?.focus();
      else activityInputRefs.current.get(focusActivityKey)?.focus();
    });
  }

  const errorEntries = Object.entries(errors);

  if (!mounted) return null;

  return createPortal((
    <div className="dialog-backdrop" onKeyDown={handleDialogKeyDown} ref={backdropRef}>
      <div
        aria-busy={isSubmitting}
        aria-describedby={descriptionId}
        aria-hidden={confirmDiscard ? "true" : undefined}
        aria-labelledby={titleId}
        aria-modal={confirmDiscard ? undefined : "true"}
        className="setup-dialog"
        ref={dialogRef}
        role="dialog"
      >
        <header className="setup-dialog__header">
          <div>
            <p className="eyebrow">{mode === "create" ? "NOUVEAU PROJET" : "PROJET ACTIF"}</p>
            <h2 id={titleId}>{mode === "create" ? "Configurer le projet" : "Paramètres du projet"}</h2>
            <p id={descriptionId}>
              {mode === "create"
                ? "Définis le cadre local avant de créer la première mission et ses activités."
                : "Mets à jour les informations locales du projet sans déclencher de déploiement."}
            </p>
          </div>
          <button
            aria-label="Fermer"
            className="dialog-close-button"
            disabled={isSubmitting}
            onClick={requestCancel}
            type="button"
          >
            ×
          </button>
        </header>

        <form className="setup-form" noValidate onSubmit={handleSubmit}>
          {errorEntries.length ? (
            <div className="error-summary" role="alert">
              <strong>Vérifie {errorEntries.length} champ{errorEntries.length > 1 ? "s" : ""}.</strong>
              <ul>
                {errorEntries.map(([field, message]) => (
                  <li key={field}><a href={`#${fieldId(field)}`}>{message}</a></li>
                ))}
              </ul>
            </div>
          ) : null}

          {submitError ? <p className="submit-error" id={formErrorId} role="alert">{submitError}</p> : null}

          <fieldset className="setup-form__section">
            <legend>Identité du projet</legend>
            <div className="form-field">
              <label htmlFor={fieldId("name")}>Nom du projet</label>
              <input
                aria-describedby={describedBy("name")}
                aria-invalid={errors.name ? "true" : undefined}
                autoComplete="off"
                disabled={isSubmitting}
                id={fieldId("name")}
                onChange={(event) => {
                  setSettings((current) => ({
                    ...current,
                    name: limitCodePoints(event.target.value, MAX_PROJECT_NAME_LENGTH),
                  }));
                  clearError("name");
                }}
                ref={firstFieldRef}
                required
                value={settings.name}
              />
              {errors.name ? <p className="field-error" id={errorId("name")}>{errors.name}</p> : null}
            </div>

            <div className="form-field">
              <label htmlFor={fieldId("description")}>Description</label>
              <textarea
                aria-describedby={describedBy("description")}
                aria-invalid={errors.description ? "true" : undefined}
                disabled={isSubmitting}
                id={fieldId("description")}
                onChange={(event) => {
                  setSettings((current) => ({
                    ...current,
                    description: limitCodePoints(event.target.value, MAX_PROJECT_DESCRIPTION_LENGTH),
                  }));
                  clearError("description");
                }}
                required
                rows={3}
                value={settings.description}
              />
              {errors.description ? (
                <p className="field-error" id={errorId("description")}>{errors.description}</p>
              ) : null}
            </div>

            <div className="form-field">
              <label htmlFor={fieldId("expectedOutcome")}>Résultat attendu</label>
              <textarea
                aria-describedby={describedBy("expectedOutcome")}
                aria-invalid={errors.expectedOutcome ? "true" : undefined}
                disabled={isSubmitting}
                id={fieldId("expectedOutcome")}
                onChange={(event) => {
                  setSettings((current) => ({
                    ...current,
                    expectedOutcome: limitCodePoints(event.target.value, MAX_PROJECT_OUTCOME_LENGTH),
                  }));
                  clearError("expectedOutcome");
                }}
                required
                rows={3}
                value={settings.expectedOutcome}
              />
              {errors.expectedOutcome ? (
                <p className="field-error" id={errorId("expectedOutcome")}>{errors.expectedOutcome}</p>
              ) : null}
            </div>
          </fieldset>

          <fieldset className="setup-form__section setup-form__grid">
            <legend>Cadre de livraison</legend>
            <div className="form-field">
              <label htmlFor={fieldId("status")}>Statut</label>
              <select
                disabled={isSubmitting}
                id={fieldId("status")}
                onChange={(event) => setSettings((current) => ({
                  ...current,
                  status: event.target.value as ProjectLifecycleStatus,
                }))}
                value={settings.status}
              >
                <option value="draft">Brouillon</option>
                <option value="active">Actif</option>
                <option value="paused">En pause</option>
                <option disabled={mode === "create"} value="completed">Terminé</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor={fieldId("environment")}>Environnement cible</label>
              <select
                disabled={isSubmitting}
                id={fieldId("environment")}
                onChange={(event) => setSettings((current) => ({
                  ...current,
                  environment: event.target.value as ProjectTargetEnvironment,
                }))}
                value={settings.environment}
              >
                <option value="development">Développement</option>
                <option value="staging">Préproduction</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div className="form-field setup-form__wide-field">
              <label htmlFor={fieldId("repositoryUrl")}>Dépôt HTTPS <span>(optionnel)</span></label>
              <input
                aria-describedby={describedBy("repositoryUrl", `${dialogId}-repository-help`)}
                aria-invalid={errors.repositoryUrl ? "true" : undefined}
                autoComplete="url"
                disabled={isSubmitting}
                id={fieldId("repositoryUrl")}
                inputMode="url"
                onChange={(event) => {
                  const value = limitCodePoints(event.target.value, MAX_REPOSITORY_URL_LENGTH);
                  setSettings((current) => ({ ...current, repositoryUrl: value || null }));
                  clearError("repositoryUrl");
                }}
                placeholder="https://github.com/organisation/projet"
                type="url"
                value={settings.repositoryUrl ?? ""}
              />
              <p className="field-help" id={`${dialogId}-repository-help`}>
                Référence HTTPS sans paramètres ni secret : aucun accès au dépôt ne sera effectué.
              </p>
              {errors.repositoryUrl ? (
                <p className="field-error" id={errorId("repositoryUrl")}>{errors.repositoryUrl}</p>
              ) : null}
            </div>
          </fieldset>

          {mode === "create" ? (
            <fieldset className="setup-form__section">
              <legend>Mission initiale</legend>
              <div className="form-field">
                <label htmlFor={fieldId("missionTitle")}>Titre de la mission</label>
                <input
                  aria-describedby={describedBy("missionTitle")}
                  aria-invalid={errors.missionTitle ? "true" : undefined}
                  disabled={isSubmitting}
                  id={fieldId("missionTitle")}
                  onChange={(event) => {
                    setMissionTitle(limitCodePoints(event.target.value, MAX_MISSION_TITLE_LENGTH));
                    clearError("missionTitle");
                  }}
                  required
                  value={missionTitle}
                />
                {errors.missionTitle ? (
                  <p className="field-error" id={errorId("missionTitle")}>{errors.missionTitle}</p>
                ) : null}
              </div>
              <div className="form-field">
                <label htmlFor={fieldId("missionOutcome")}>Résultat de la mission</label>
                <textarea
                  aria-describedby={describedBy("missionOutcome")}
                  aria-invalid={errors.missionOutcome ? "true" : undefined}
                  disabled={isSubmitting}
                  id={fieldId("missionOutcome")}
                  onChange={(event) => {
                    setMissionOutcome(limitCodePoints(event.target.value, MAX_MISSION_OUTCOME_LENGTH));
                    clearError("missionOutcome");
                  }}
                  required
                  rows={2}
                  value={missionOutcome}
                />
                {errors.missionOutcome ? (
                  <p className="field-error" id={errorId("missionOutcome")}>{errors.missionOutcome}</p>
                ) : null}
              </div>

              <div className="activity-editor">
                <div className="activity-editor__heading">
                  <div>
                    <h3>Activités initiales</h3>
                    <p>Chaque activité deviendra une tâche avec ses contrôles de validation.</p>
                  </div>
                  <button
                    className="secondary-button"
                    disabled={isSubmitting || activities.length >= MAX_INITIAL_ACTIVITY_COUNT}
                    onClick={addActivity}
                    ref={addActivityButtonRef}
                    type="button"
                  >
                    Ajouter une activité
                  </button>
                </div>
                <ol className="activity-fields">
                  {activities.map((activity, index) => {
                    const activityField = `activity-${index}`;
                    return (
                      <li className="activity-field" key={activity.key}>
                        <div className="form-field">
                          <label htmlFor={fieldId(activityField)}>Activité {index + 1}</label>
                          <input
                            aria-describedby={describedBy(activityField)}
                            aria-invalid={errors[activityField] ? "true" : undefined}
                            disabled={isSubmitting}
                            id={fieldId(activityField)}
                            onChange={(event) => {
                              const nextActivities = activities.map((item, currentIndex) => (
                                currentIndex === index
                                  ? { ...item, value: limitCodePoints(event.target.value, MAX_TASK_LABEL_LENGTH) }
                                  : item
                              ));
                              setActivities(nextActivities);
                              setErrors((current) => recalculateVisibleActivityErrors(current, nextActivities));
                              setSubmitError(null);
                            }}
                            ref={(node) => {
                              if (node) activityInputRefs.current.set(activity.key, node);
                              else activityInputRefs.current.delete(activity.key);
                            }}
                            required
                            value={activity.value}
                          />
                          {errors[activityField] ? (
                            <p className="field-error" id={errorId(activityField)}>{errors[activityField]}</p>
                          ) : null}
                        </div>
                        <button
                          aria-label={`Retirer l’activité ${index + 1}`}
                          className="remove-activity-button"
                          disabled={isSubmitting || activities.length === 1}
                          onClick={() => removeActivity(index)}
                          type="button"
                        >
                          Retirer
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </fieldset>
          ) : null}

          <footer className="setup-dialog__actions">
            <button className="secondary-button" disabled={isSubmitting} onClick={requestCancel} type="button">
              Annuler
            </button>
            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting
                ? "Enregistrement…"
                : mode === "create"
                  ? "Créer le projet"
                  : "Enregistrer les paramètres"}
            </button>
          </footer>
        </form>
      </div>
      {confirmDiscard ? (
        <section
          aria-describedby={`${dialogId}-discard-description`}
          aria-labelledby={`${dialogId}-discard-title`}
          aria-modal="true"
          className="discard-confirmation"
          ref={discardDialogRef}
          role="alertdialog"
        >
          <div>
            <strong id={`${dialogId}-discard-title`}>Abandonner les modifications ?</strong>
            <p id={`${dialogId}-discard-description`}>Les informations saisies dans ce dialogue seront perdues.</p>
          </div>
          <div className="discard-confirmation__actions">
            <button
              className="secondary-button"
              onClick={continueEditing}
              ref={discardContinueRef}
              type="button"
            >
              Continuer la saisie
            </button>
            <button className="danger-button" onClick={onCancel} type="button">
              Abandonner
            </button>
          </div>
        </section>
      ) : null}
    </div>
  ), document.body);
}

export default ProjectSetupDialog;
